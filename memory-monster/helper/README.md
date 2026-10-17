# Memory Monster helper

A website cannot see how full your computer's memory is. This small program can. It runs on your own computer, listens only on `127.0.0.1` (nothing outside your computer can reach it), and answers the Memory Monster page.

1. Install Node.js (version 20 or newer).
2. Copy `helper.config.example.json` to `helper.config.json` and put your Vercel address in `allowedOrigins`.
3. Double-click `start-helper.bat`. A window opens and prints an address and a code.
4. In Memory Monster, open **Settings**, choose the **Helper on this computer** source, and paste the address and code.

Close the window to stop the helper. It does not start with Windows and it has no network access beyond your own computer.

What it can do, and nothing else:
- Report the percent of memory in use.
- List the five programs using the most memory (system programs are never listed).
- Ask a listed program to close, only when the page sends a request that carries your code. It asks politely, so a program with unsaved work can still ask you to save.
