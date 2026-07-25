import { Body2 } from '@fluentui/react-components'
import {
  SaveRegular,
  CloudArrowUpRegular,
  DocumentBulletListRegular,
  FolderRegular,
  ArrowSyncRegular,
  BugRegular,
  WindowDevToolsRegular,
  SignOutRegular,
} from '@fluentui/react-icons'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { DialogRef, Notice } from '@/components/base'
import {
  exitApp,
  openAppDir,
  openCoreDir,
  openLogsDir,
  openDevTools,
  exportDiagnosticInfo,
} from '@/services/cmds'
import { checkUpdateThrottled } from '@/services/update-check'
import { version } from '@root/package.json'

import { BackupViewer } from './mods/backup-viewer'
import { ConfigViewer } from './mods/config-viewer'
import { LocalBackupViewer } from './mods/local-backup-viewer'
import {
  FluentSettingList,
  FluentSettingItem,
  FluentSettingGroup,
} from './mods/setting-comp'
import { UpdateViewer } from './mods/update-viewer'

interface Props {
  onError?: (err: Error) => void
  hideTitle?: boolean
}

const SettingMaintenance = ({ onError, hideTitle }: Props) => {
  const { t } = useTranslation()

  const configRef = useRef<DialogRef>(null)
  const updateRef = useRef<DialogRef>(null)
  const backupRef = useRef<DialogRef>(null)
  const localBackupRef = useRef<DialogRef>(null)

  const onCheckUpdate = async () => {
    try {
      const info = await checkUpdateThrottled(true)
      if (!info?.available) {
        Notice.success(t('Currently on the Latest Version'))
      } else {
        updateRef.current?.open()
      }
    } catch (err: any) {
      Notice.error(err.message || err.toString())
    }
  }

  return (
    <FluentSettingList title={hideTitle ? undefined : t('Maintenance')}>
      <ConfigViewer ref={configRef} />
      <UpdateViewer ref={updateRef} />
      <BackupViewer ref={backupRef} />

      <FluentSettingGroup title={t('group.backup_config')} first />

      <FluentSettingItem
        icon={<SaveRegular />}
        label={t('Local Backup')}
        canExpand
        content={<LocalBackupViewer ref={localBackupRef} />}
      />

      <FluentSettingItem
        icon={<CloudArrowUpRegular />}
        onClick={() => backupRef.current?.open()}
        label={t('Backup Setting')}
        secondary={t('Backup Setting Info')}
        actionLabel={t('Change')}
      />

      <FluentSettingItem
        icon={<DocumentBulletListRegular />}
        onClick={() => configRef.current?.open()}
        label={t('Runtime Config')}
        actionLabel={t('View')}
      />

      <FluentSettingGroup title={t('group.directories')} />

      <FluentSettingItem
        icon={<FolderRegular />}
        onClick={openAppDir}
        label={t('Open Conf Dir')}
        secondary={t('Open Conf Dir Info')}
        actionLabel={t('Open')}
      />

      <FluentSettingItem
        icon={<FolderRegular />}
        onClick={openCoreDir}
        label={t('Open Core Dir')}
        actionLabel={t('Open')}
      />

      <FluentSettingItem
        icon={<FolderRegular />}
        onClick={openLogsDir}
        label={t('Open Logs Dir')}
        actionLabel={t('Open')}
      />

      <FluentSettingGroup title={t('group.updates_diag')} />

      <FluentSettingItem
        icon={<ArrowSyncRegular />}
        onClick={onCheckUpdate}
        label={t('Check for Updates')}
        actionLabel={t('Check')}
      />

      <FluentSettingItem
        icon={<BugRegular />}
        label={t('Export Diagnostic Info')}
        actionLabel={t('Export')}
        onClick={async () => {
          try {
            await exportDiagnosticInfo()
            Notice.success(t('Diagnostic Info Exported'), 1000)
          } catch (err: any) {
            Notice.error(err?.message || err?.toString())
          }
        }}
      />

      <FluentSettingItem
        icon={<WindowDevToolsRegular />}
        onClick={openDevTools}
        label={t('Open Dev Tools')}
        actionLabel={t('Open')}
      />

      <FluentSettingItem
        icon={<SignOutRegular />}
        onClick={() => {
          exitApp()
        }}
        label={t('Exit')}
        actionLabel={t('Exit')}
      />

      <div
        style={{
          paddingBlock: 32,
          paddingRight: 12,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Body2>v{version}</Body2>
      </div>
    </FluentSettingList>
  )
}

export default SettingMaintenance
