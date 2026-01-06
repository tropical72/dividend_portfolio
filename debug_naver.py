import requests
from bs4 import BeautifulSoup

def test_naver(code):
    url = f"https://finance.naver.com/item/main.naver?code={code}"
    print(f"Testing URL: {url}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        res = requests.get(url, headers=headers)
        res.raise_for_status()
        
        soup = BeautifulSoup(res.text, "html.parser")
        
        # 1. 가격 찾기 시도
        no_today = soup.find("p", {"class": "no_today"})
        if no_today:
            price_span = no_today.find("span", {"class": "blind"})
            if price_span:
                print(f"Price found: {price_span.text}")
            else:
                print("Price span not found inside no_today")
        else:
            print("Element 'p.no_today' not found. (Page structure might have changed or invalid code)")
            
        # 2. 이름 찾기 시도
        wrap_company = soup.find("div", {"class": "wrap_company"})
        if wrap_company:
            h2 = wrap_company.find("h2")
            if h2:
                print(f"Name found: {h2.text}")
            else:
                print("Name h2 not found")
        else:
            print("Element 'div.wrap_company' not found")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_naver("441640")
