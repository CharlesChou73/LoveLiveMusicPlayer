import {app, dialog} from 'electron'
import {autoUpdater} from 'electron-updater'
import https from 'https'
import {VersionUtils} from "../../renderer/utils/VersionUtils";

export default class update {
    private callback: Function | undefined;
    private isSuccess = false

    constructor() {
        autoUpdater.autoDownload = false
        this.initListener()
    }

    initListener() {
        // https://www.electron.build/auto-update#events
        // https://electronjs.org/docs/api/auto-updater#autoupdaterquitandinstall
        autoUpdater.on('update-downloaded', _info => {
            this.showDialog("已更新完成，请重启应用", ["确定"]).then(_ => {
                this.isSuccess = true
                autoUpdater.quitAndInstall(true, true)
            })
        })

        autoUpdater.on('error', _info => {
            if (!this.isSuccess) {
                this.showDialog("更新失败，请稍后重试", ["知道了"])
            }
        })

        autoUpdater.on('download-progress', progressObj => {
            this.callback?.call(this, JSON.stringify(progressObj))
        })
    }

    checkUpdate(callback: Function) {
        this.callback = callback
        const url = VersionUtils.refreshDataUrl()
        // 这里先拉取更新信息，在对话框中显示版本的更新内容
        const req = https.request(url, req => {
            let message = ''
            req.setEncoding('utf-8')
            req.on('data', chunk => {
                message += chunk.toString()
            })
            req.on('end', () => {
                const json = JSON.parse(message)
                const localVersion = app.getVersion().split('.').join('')
                const remoteVersion = json.version.split('.').join('')
                if (localVersion >= remoteVersion) {
                    this.showDialog('已经是最新版本了', ["知道了"])
                } else {
                    this.showDialog(`检测到新版本（${json.version}）是否更新`, ["取消", "确定"], json.message).then(rtn => {
                        if (rtn.response === 1) {
                            autoUpdater.autoDownload = true
                            autoUpdater.setFeedURL(json.url)
                            autoUpdater.checkForUpdates()
                        }
                    })
                }
            })
        })
        req.end()
    }

    showDialog(message: string, buttons: string[], detail?: string) {
        return dialog.showMessageBox({
            type: 'info',
            title: '软件更新',
            message: message,
            detail: this.checkNull(detail),
            buttons: buttons,
            noLink: true
        })
    }

    checkNull(value?: string): string {
        if (value === null || value == undefined) {
            return ""
        } else {
            return value
        }
    }
}