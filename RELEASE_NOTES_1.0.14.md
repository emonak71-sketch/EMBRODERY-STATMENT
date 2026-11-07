# Embroidery Statement 1.0.14

## Worker and payroll improvements
- Salary Increase now asks for the increase amount directly and calculates the new monthly salary automatically.
- Salary increment history retains the previous salary, increase amount, new salary, effective date and reason.
- Completing a worker record can prepare an editable SMS message; sending remains optional.

## Owner-controlled SMS
- Owner Control Center can enable or disable worker SMS service for customer accounts.
- When disabled, SMS controls and SMS history are hidden in the customer app.
- The SMS Edge Function checks the platform setting server-side and blocks direct send attempts while disabled.
- Worker completion SMS is supported in the existing SMS history.

## Compatibility
- Preserves existing customer, worker, payroll, attendance and transaction records.
- Keeps separate Customer and Owner Windows updater channels and the Android direct APK release channel.
