import requests
import json

def test_return_impact():
    base_url = "http://localhost:8000/api/retirement"
    
    # 1. 현재 설정 가져오기
    config = requests.get(f"{base_url}/config").json()["data"]
    active_id = config["active_assumption_id"]
    
    # 2. 수익률 5%로 설정 후 시뮬레이션
    config["assumptions"][active_id]["expected_return"] = 0.05
    requests.post(f"{base_url}/config", json=config)
    res_low = requests.get(f"{base_url}/simulate?scenario={active_id}").json()
    nw_low = res_low["data"]["monthly_data"][-1]["total_net_worth"]
    
    # 3. 수익률 15%로 설정 후 시뮬레이션
    config["assumptions"][active_id]["expected_return"] = 0.15
    requests.post(f"{base_url}/config", json=config)
    res_high = requests.get(f"{base_url}/simulate?scenario={active_id}").json()
    nw_high = res_high["data"]["monthly_data"][-1]["total_net_worth"]
    
    print(f"Low Return NW: {nw_low}")
    print(f"High Return NW: {nw_high}")
    
    if nw_low == nw_high:
        print("FAIL: Simulation results are IDENTICAL despite different return rates.")
    else:
        print("SUCCESS: Simulation results changed based on return rate.")

if __name__ == "__main__":
    test_return_impact()
