; Remove only the Embroidery Statement autostart value when the user uninstalls.
; The Tauri autostart plugin uses this stable app_name for its Run value.
!macro NSIS_HOOK_PREUNINSTALL
  SetRegView 64
  ClearErrors
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Embroidery Statement"
  ClearErrors
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "Embroidery Statement"
  ClearErrors
  SetRegView 32
  ClearErrors
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Embroidery Statement"
  ClearErrors
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "Embroidery Statement"
  ClearErrors
!macroend
