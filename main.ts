import { App, Notice, Plugin, TFile, PluginSettingTab, Setting } from 'obsidian';

interface BacklinkCollectorSettings {
	outputFolder: string;
}

const DEFAULT_SETTINGS: BacklinkCollectorSettings = {
	outputFolder: 'Backlinks'
}

export default class BacklinkCollectorPlugin extends Plugin {
	settings: BacklinkCollectorSettings;

	async onload() {
		await this.loadSettings();

		// 커맨드 팔레트에 명령 추가
		this.addCommand({
			id: 'collect-backlinks',
			name: 'Collect backlinks for current note',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					void this.collectBacklinks(activeFile);
				} else {
					new Notice('No active note found');
				}
			}
		});

		// 컨텍스트 메뉴에 추가 (파일 우클릭)
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFile && file.extension === 'md') {
					menu.addItem((item) => {
						item
							.setTitle('Collect backlinks')
							.setIcon('links-coming-in')
							.onClick(async () => {
								await this.collectBacklinks(file);
							});
					});
				}
			})
		);

		// 설정 탭 추가
		this.addSettingTab(new BacklinkCollectorSettingTab(this.app, this));

		// URI 프로토콜 등록 (Refresh 링크용)
		this.registerObsidianProtocolHandler('backlink-collector-refresh', async (params) => {
			const noteName = params.note;
			if (!noteName) {
				new Notice('No note name provided');
				return;
			}

			// 노트 파일 찾기
			const files = this.app.vault.getMarkdownFiles();
			const targetFile = files.find(f => f.basename === noteName);

			if (targetFile) {
				await this.collectBacklinks(targetFile);
			} else {
				new Notice(`Note "${noteName}" not found`);
			}
		});
	}

	onunload() {
		// cleanup handled by Obsidian
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async collectBacklinks(targetFile: TFile) {
		const targetNoteName = targetFile.basename;
		new Notice(`Collecting backlinks for "${targetNoteName}"...`);

		// 모든 마크다운 파일 가져오기
		const allFiles = this.app.vault.getMarkdownFiles();
		const backlinks: Array<{
			fileName: string;
			filePath: string;
			count: number;
			contexts: string[];
		}> = [];

		// 각 파일에서 백링크 찾기
		for (const file of allFiles) {
			// 설정된 출력 폴더 안의 파일들은 제외 (재귀 방지)
			if (this.settings.outputFolder && file.path.startsWith(this.settings.outputFolder + '/')) {
				continue;
			}

			const content = await this.app.vault.read(file);
			const matches = this.findBacklinksInContent(content, targetNoteName);

			if (matches.contexts.length > 0) {
				backlinks.push({
					fileName: file.basename,
					filePath: file.path,
					count: matches.count,
					contexts: matches.contexts
				});
			}
		}

		if (backlinks.length === 0) {
			new Notice(`No backlinks found for "${targetNoteName}"`);
			return;
		}

		// 백링크 문서 생성
		const outputContent = this.generateBacklinkDocument(targetNoteName, backlinks);
		const outputFileName = `${targetNoteName}_backlinks.md`;
		const outputPath = this.settings.outputFolder
			? `${this.settings.outputFolder}/${outputFileName}`
			: outputFileName;

		// 출력 폴더가 설정되어 있으면 폴더 생성 (없을 경우)
		if (this.settings.outputFolder) {
			const folder = this.app.vault.getAbstractFileByPath(this.settings.outputFolder);
			if (!folder) {
				await this.app.vault.createFolder(this.settings.outputFolder);
			}
		}

		// 파일 생성 또는 덮어쓰기
		const existingFile = this.app.vault.getAbstractFileByPath(outputPath);
		if (existingFile instanceof TFile) {
			await this.app.vault.modify(existingFile, outputContent);
		} else {
			await this.app.vault.create(outputPath, outputContent);
		}

		new Notice(`Backlinks collected! Found ${backlinks.length} files. Saved to ${outputPath}`);

		// 생성된 파일 열기
		const newFile = this.app.vault.getAbstractFileByPath(outputPath);
		if (newFile instanceof TFile) {
			await this.app.workspace.getLeaf().openFile(newFile);
		}
	}

	findBacklinksInContent(content: string, targetNoteName: string): { count: number; contexts: string[] } {
		const linkPattern = new RegExp(`\\[\\[${targetNoteName}(?:\\|[^\\]]+)?\\]\\]`, 'g');
		const matches = content.match(linkPattern);

		if (!matches || matches.length === 0) {
			return { count: 0, contexts: [] };
		}

		const lines = content.split('\n');
		const contexts: string[] = [];

		// 들여쓰기 레벨 계산 (탭을 4칸 스페이스로 환산)
		const getIndentLevel = (str: string): number => {
			const match = str.match(/^(\s*)/);
			if (!match) return 0;
			return match[0].replace(/\t/g, '    ').length;
		};

		lines.forEach((line, index) => {
			if (line.includes(`[[${targetNoteName}`)) {
				const contextLines: string[] = [];
				const currentIndent = getIndentLevel(line);

				// 백링크가 있는 줄 포함
				contextLines.push(line);

				// 다음 줄들 중 들여쓰기가 더 깊은 줄들 모두 포함
				let nextIndex = index + 1;
				while (nextIndex < lines.length) {
					const nextLine = lines[nextIndex];

					// 빈 줄은 포함하되 계속 진행
					if (nextLine.trim() === '') {
						contextLines.push(nextLine);
						nextIndex++;
						continue;
					}

					const nextIndent = getIndentLevel(nextLine);

					// 들여쓰기가 현재 레벨보다 깊으면 포함
					if (nextIndent > currentIndent) {
						contextLines.push(nextLine);
						nextIndex++;
					} else {
						// 들여쓰기가 같거나 얕으면 중단
						break;
					}
				}

				contexts.push(contextLines.join('\n'));
			}
		});

		return { count: matches.length, contexts };
	}

	generateBacklinkDocument(targetNoteName: string, backlinks: Array<{ fileName: string; filePath: string; count: number; contexts: string[] }>): string {
		// Refresh 링크 추가
		const refreshUrl = `obsidian://backlink-collector-refresh?note=${encodeURIComponent(targetNoteName)}`;
		let content = `[🔄 Refresh](${refreshUrl})\n\n---\n\n`;

		backlinks.forEach((backlink, index) => {
			content += `[[${backlink.fileName}]]\n\n`;

			backlink.contexts.forEach((context: string) => {
				content += `${context}\n\n`;
			});

			if (index < backlinks.length - 1) {
				content += `---\n\n`;
			}
		});

		return content;
	}
}

class BacklinkCollectorSettingTab extends PluginSettingTab {
	plugin: BacklinkCollectorPlugin;

	constructor(app: App, plugin: BacklinkCollectorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Output folder')
			.setDesc('백링크 문서를 저장할 폴더. 이 폴더 안의 파일들은 백링크 검색에서 자동으로 제외됩니다.')
			.addText(text => text
				.setPlaceholder('Backlinks')
				.setValue(this.plugin.settings.outputFolder)
				.onChange(async (value) => {
					this.plugin.settings.outputFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
