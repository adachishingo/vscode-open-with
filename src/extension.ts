import * as vscode from 'vscode';
import open = require('open');

export function activate(context: vscode.ExtensionContext) {
	let configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('openWith');
	const disposable = new Disposable(configuration);
	context.subscriptions.push(disposable);
}

class Disposable implements vscode.Disposable {

	private _disposable: vscode.Disposable;
	private _configuration: any;

	constructor(configuration: any) {

		const subscriptions: vscode.Disposable[] = [];
		const disposable = vscode.commands.registerCommand('workbench.action.files.openFileWithExternal', (uri: vscode.Uri | undefined) => {
			this.open(uri);
		});
		subscriptions.push(disposable);

		this._disposable = vscode.Disposable.from(...subscriptions);
		this._configuration = configuration;
	}

	dispose(): void {
		this._disposable.dispose();
	}

	private open(uri: vscode.Uri | undefined): void {

		if (uri?.scheme) {
			this.openFile(uri.toString());
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (editor?.document.uri) {
			this.openFile(editor.document.uri.toString());
			return;
		}

		const { uri: tab_uri } = vscode.window.tabGroups.activeTabGroup.activeTab
			?.input as {
				uri?: vscode.Uri;
			};

		if (tab_uri) {
			this.openFile(tab_uri.toString());
			return;
		}
	}

	private async openFile(uri: string): Promise<void> {

		let items: vscode.QuickPickItem[] = [];

		for (const [key, value] of Object.entries(this._configuration.externalApp.apps)) {
			items.push({
				label: key,
				description: value as string,
			});
		}

		if (this._configuration.defaultApp.enable) {
			items.push({ label: 'Default Editor', description: '' });
		}

		if (items.length == 1) {
			this.openFileWithApp(uri, items[0].description!);
		} else {
			const result = await vscode.window.showQuickPick(
				items,
				{ placeHolder: 'editor name', }
			);

			let app: string = result?.description!;

			if (result) {
				this.openFileWithApp(uri, app);
			}
		}
	}

	private openFileWithApp(uri: string, app: string) {
		try {
			let option = {};
			if (app) {
				option = { app: { name: app } };
			}
			const p = open(decodeURIComponent(uri), option);
			p.then((p) => {
				p.on("exit", (n) => {
					if (n != 0) {
						vscode.window.showInformationMessage(
							"Open " + decodeURIComponent(uri) + " with " + app + " failed."
						);
					}
				});
			});
		} catch (error) {
			vscode.window.showInformationMessage(
				"Open " + decodeURIComponent(uri) + " with " + app + " failed."
			);
			if (error instanceof Error) {
				console.error(error.stack);
			}
		}
	}
}
