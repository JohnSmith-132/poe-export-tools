# Poe Export Tools

These Python scripts allows you to download your history or Creator earnings from Poe. It automates the process of logging in to Poe, navigating to a specific chat URL, scrolling through the chat history or tabs, and downloading + formatting the relevant info.

## Features

- Automated login to Poe using email verification
- Scrolls through entire chat history to find all images, chats, or creator earnings
- Concurrent downloading of images for improved speed
- Handles duplicate images using MD5 hashing
- Detailed logging for easy troubleshooting

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Python 3.6+
- Chrome browser installed
- ChromeDriver (compatible with your Chrome version)
  > Stable versions of ChromeDriver for your OS can be found [here](https://googlechromelabs.github.io/chrome-for-testing/#stable).

## Installation

1. Clone this repository:

   ```
   git clone https://github.com/JohnSmith-132/poe-export-tools.git
   cd poe-export-tools
   ```

2. Install the required Python packages:

   ```
   pip install -r requirements.txt
   ```

3. Set up your environment variables:
   Create a `.env` file in the project root and add your Poe email:
   ```
   POE_EMAIL=your.email@example.com
   ```
   This is used by the script for typing automation, nothing else.

## Usage

Run the script using Python:

```
python poe_image_downloader.py
```

You will be prompted to enter:

1. The Poe chat URL you want to download images from
2. The directory where you want to save the images (default is "PoeChatImages")

The script will then use Selenium to:

1. Log in to Poe (in the command line, you'll need to enter the verification code sent to your email)
2. Navigate to the provided chat URL
3. Scroll and load the entire chat history
4. Download all found images to the specified directory

## Dependencies

- selenium
- requests
- python-dotenv

## Contributing

Contributions to this project are welcome. Please fork the repository and submit a pull request with your changes.

## Security

When using this script, please keep the following security considerations in mind:

1. **Credential Protection**: The script uses environment variables to store your Poe email. Never share your `.env` file or commit it to version control.

2. **Verification Codes**: The script requires manual input of verification codes. Never automate this process or share these codes, as they provide direct access to your Poe account.

3. **Use of Selenium**: This script uses Selenium, which controls a real browser instance. Ensure you're running this on a trusted machine and network.

4. **Downloaded Content**: Be cautious with downloaded images. They are saved as-is from the source. If you're unsure about the content, scan the downloaded files with antivirus software before opening.

5. **Rate Limiting**: Be respectful of Poe's servers. Avoid running the script excessively in short periods to prevent potential account restrictions.

6. **Updates**: Regularly update the script and its dependencies to ensure you have the latest security patches.

7. **Permissions**: Only use this script to download images from chats you have permission to access. Respect copyright and privacy rights.

8. **Code Review**: If you modify the script, be careful not to introduce security vulnerabilities. Avoid executing any code from untrusted sources.

By following these guidelines, you can use the Poe Chat Image Downloader more securely. Remember, security is a shared responsibility between the tool and its users.

## Disclaimer

This tool is for personal use only. Please respect Poe's terms of service and do not use this script to violate any copyrights or to download content you do not have permission to access.

## License

MIT Open Source
