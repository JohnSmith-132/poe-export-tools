<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/JohnSmith-132/poe-export-tools">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Poe Export Tools</h3>

  <p align="center">
    Python scripts to download your history or Creator earnings from Poe
    <br />
    <a href="https://github.com/JohnSmith-132/poe-export-tools"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/JohnSmith-132/poe-export-tools">View Demo</a>
    ·
    <a href="https://github.com/JohnSmith-132/poe-export-tools/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    ·
    <a href="https://github.com/JohnSmith-132/poe-export-tools/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#security">Security</a></li>
    <li><a href="#disclaimer">Disclaimer</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

Poe Export Tools is a collection of Python scripts that automate the process of downloading your history or Creator earnings from Poe. These tools log in to Poe, navigate to specific URLs, scroll through chat history or tabs, and download and format the relevant information.

### Features:

- Automated login to Poe using email verification
- Scrolls through entire chat history to find all images, chats, or creator earnings
- Concurrent downloading of images for improved speed
- Handles duplicate images using MD5 hashing
- Detailed logging for easy troubleshooting

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Python][Python.org]][Python-url]
* [![Selenium][Selenium.dev]][Selenium-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Before you begin, ensure you have met the following requirements:
* Python 3.6+
* Chrome browser installed
* ChromeDriver (compatible with your Chrome version)
  > Stable versions of ChromeDriver for your OS can be found [here](https://googlechromelabs.github.io/chrome-for-testing/#stable).

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/JohnSmith-132/poe-export-tools.git
   ```
2. Change into the project directory
   ```sh
   cd poe-export-tools
   ```
3. Install required packages
   ```sh
   pip install -r requirements.txt
   ```
4. Set up your environment variables:
   Create a `.env` file in the project root and add your Poe email:
   ```
   POE_EMAIL=your.email@example.com
   ```
   This is used by the script for typing automation, nothing else.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
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

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- SECURITY -->
## Security

When using these scripts, please keep the following security considerations in mind:

1. **Credential Protection**: The scripts use environment variables to store your Poe email. Never share your `.env` file or commit it to version control.
2. **Verification Codes**: The scripts require manual input of verification codes. Never automate this process or share these codes, as they provide direct access to your Poe account.
3. **Use of Selenium**: These scripts use Selenium, which controls a real browser instance. Ensure you're running this on a trusted machine and network.
4. **Downloaded Content**: Be cautious with downloaded content. If you're unsure about the content, scan the downloaded files with antivirus software before opening.
5. **Rate Limiting**: Be respectful of Poe's servers. Avoid running the scripts excessively in short periods to prevent potential account restrictions.
6. **Updates**: Regularly update the scripts and their dependencies to ensure you have the latest security patches.
7. **Permissions**: Only use these scripts to download content you have permission to access. Respect copyright and privacy rights.
8. **Code Review**: If you modify the scripts, be careful not to introduce security vulnerabilities. Avoid executing any code from untrusted sources.

By following these guidelines, you can use the Poe Export Tools more securely. Remember, security is a shared responsibility between the tools and their users.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DISCLAIMER -->
## Disclaimer

These tools are for personal use only. Please respect Poe's terms of service and do not use these scripts to violate any copyrights or to download content you do not have permission to access.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[license-shield]: https://img.shields.io/github/license/JohnSmith-132/poe-export-tools.svg?style=for-the-badge
[license-url]: https://github.com/JohnSmith-132/poe-export-tools/blob/master/LICENSE.txt
[Python.org]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[Selenium.dev]: https://img.shields.io/badge/Selenium-43B02A?style=for-the-badge&logo=selenium&logoColor=white
[Selenium-url]: https://www.selenium.dev/
