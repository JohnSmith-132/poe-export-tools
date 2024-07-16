import os
import csv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from dotenv import load_dotenv
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()

def setup_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("start-maximized")
    
    # Add these lines to suppress Chrome logging
    options.add_experimental_option('excludeSwitches', ['enable-logging'])
    options.add_argument("--log-level=3")
    
    return webdriver.Chrome(options=options)

def login_to_poe(driver, email):
    try:
        logging.info("Navigating to login page...")
        driver.get("https://poe.com/login")
        
        logging.info("Waiting for email input field...")
        email_input = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
        )
        
        logging.info("Entering email...")
        email_input.send_keys(email)
        
        logging.info("Clicking Go button...")
        go_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[text()='Go']"))
        )
        go_button.click()
        
        logging.info("Waiting for verification code input...")
        verification_input = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input.VerificationCodeInput_verificationCodeInput__RgX85"))
        )
        
        verification_code = input("Enter the verification code sent to your email: ")
        verification_input.send_keys(verification_code)
        
        logging.info("Clicking Log In button...")
        login_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'Button_buttonBase__Bv9Vx') and contains(@class, 'Button_primary__6UIn0') and text()='Log In']"))
        )
        login_button.click()
        
        logging.info("Waiting for login to complete...")
        time.sleep(5)
        
        logging.info("Login process completed.")
    except Exception as e:
        logging.error(f"An error occurred during login: {str(e)}")
        raise

def extract_table_data(table):
    rows = table.find_elements(By.TAG_NAME, "tr")[1:]  # Skip header row
    data = []
    
    for row in rows:
        cols = row.find_elements(By.TAG_NAME, "td")
        if len(cols) == 6:
            bot_name = cols[0].find_element(By.CLASS_NAME, "CreatorHubBotMetricsTable_botName__XTijb").text.strip()
            earnings = cols[1].find_element(By.CLASS_NAME, "CreatorHubBotMetricsTable_mainEarnings__byXzb").text.strip()
            messages = cols[2].find_element(By.CLASS_NAME, "CreatorHubBotMetricsTable_mainEarnings__byXzb").text.strip()
            unique_users = cols[3].find_element(By.CLASS_NAME, "CreatorHubBotMetricsTable_mainEarnings__byXzb").text.strip()
            followers = cols[4].find_element(By.CLASS_NAME, "CreatorHubBotMetricsTable_mainEarnings__byXzb").text.strip()
            upvote_ratio = cols[5].find_element(By.CLASS_NAME, "CreatorHubBotMetricsTable_mainEarnings__byXzb").text.strip()
            
            data.append([bot_name, earnings, messages, unique_users, followers, upvote_ratio])
    
    return data

def extract_creator_earnings(driver):
    logging.info("Navigating to creators page...")
    driver.get("https://poe.com/creators")
    
    logging.info("Waiting for earnings table to load...")
    table = WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.CLASS_NAME, "CreatorHubBotMetricsTable_table__8JeRY"))
    )
    
    headers = [th.text.strip() for th in table.find_elements(By.TAG_NAME, "th")]
    
    all_data = []
    page = 1
    
    while True:
        logging.info(f"Extracting data from page {page}")
        page_data = extract_table_data(table)
        all_data.extend(page_data)
        
        try:
            # Find the paging section
            paging_section = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "CreatorHubBotMetricsTable_pagingSection__gyBfy"))
            )
            
            # Find all buttons in the paging section
            buttons = paging_section.find_elements(By.TAG_NAME, "button")
            
            # The next button should be the last button
            next_button = buttons[-1] if buttons else None
            
            if next_button is None or next_button.get_attribute('disabled') == 'true':
                logging.info("Next button is disabled or not found. Reached the last page.")
                break
            
            next_button.click()
            logging.info(f"Clicked next page button. Moving to page {page + 1}")
            
            # Wait for the table to update
            time.sleep(2)
            
            # Re-locate the table after page change
            table = WebDriverWait(driver, 30).until(
                EC.presence_of_element_located((By.CLASS_NAME, "CreatorHubBotMetricsTable_table__8JeRY"))
            )
            
            page += 1
        except TimeoutException:
            logging.info("No more pages to navigate")
            break
        except Exception as e:
            logging.error(f"An error occurred while navigating: {str(e)}")
            break
    
    logging.info(f"Extracted data for {len(all_data)} bots across {page} pages")
    return headers, all_data

def save_to_csv(headers, data, filename):
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(headers)
        writer.writerows(data)
    logging.info(f"Data exported successfully to {filename}")

def export_poe_creator_earnings(output_file):
    email = os.getenv('POE_EMAIL')
    if not email:
        raise ValueError("POE_EMAIL environment variable is not set")

    driver = setup_driver()
    
    try:
        login_to_poe(driver, email)
        headers, data = extract_creator_earnings(driver)
        save_to_csv(headers, data, output_file)
    finally:
        driver.quit()

if __name__ == "__main__":
    output_file = input("Enter the output CSV filename (default: poe_creator_earnings.csv): ") or "poe_creator_earnings.csv"
    export_poe_creator_earnings(output_file)