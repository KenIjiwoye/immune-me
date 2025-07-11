## Prompt for task: BE-03 Auth setup
please work on this ticket @/project-tasks/backend/BE-03-authentication-system.md 
the backend adonis project is located in @/backend
please ONLY work on this current ticket and complete the task when finished. also update memory-bank and IGNORE conport.

please be adivised that the latest version of AdonisJS made changes to Auth setup.

please read the docs:
```
https://docs.adonisjs.com/guides/authentication/verifying-user-credentials#verifying-credentials
```

due to the new authFinder mixin, you can verify credentials with one line like so:
 ```
 const user = await User.verifyCredentials(email, password)
 ```

please note that we are using docker containers in this project. please remember this when executing commands