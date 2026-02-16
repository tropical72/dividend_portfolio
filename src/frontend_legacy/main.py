from kivy.config import Config

# 윈도우 크기 설정
Config.set('graphics', 'width', '1200')
Config.set('graphics', 'height', '800')

import logging
import os
import sys

# 로그 과다 출력으로 인한 성능 저하 방지
logging.getLogger('yfinance').setLevel(logging.ERROR)
logging.getLogger('peewee').setLevel(logging.ERROR)

# 프로젝트 루트를 path에 추가하여 src.backend 임포트 가능하게 설정
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from kivy.clock import Clock
from kivy.core.text import LabelBase
from kivy.lang import Builder
from kivy.metrics import dp
from kivymd.app import MDApp
from kivymd.uix.datatables import MDDataTable
from kivymd.uix.menu import MDDropdownMenu

from src.backend.api import DividendBackend

# KV Language로 UI 레이아웃 정의 (가독성을 위해 파이썬 코드 내 문자열로 포함)
KV = """
MDBoxLayout:
    orientation: 'vertical'

    MDScreenManager:
        id: screen_manager
        
        MDScreen:
            name: "main_screen"
            
            MDBottomNavigation:
                id: bottom_nav
                selected_color_background: "orange"
                text_color_active: "lightgrey"

                MDBottomNavigationItem:
                    name: "screen_watchlist"
                    text: "Watchlist"
                    icon: "format-list-bulleted"
                    
                    MDBoxLayout:
                        orientation: 'vertical'
                        padding: "16dp"
                        spacing: "12dp"

                        MDBoxLayout:
                            orientation: 'horizontal'
                            adaptive_height: True
                            spacing: "8dp"

                            MDRaisedButton:
                                id: country_button
                                text: "US"
                                size_hint_x: None
                                width: "60dp"
                                font_name: "Malgun"
                                on_release: app.menu.open()

                            MDTextField:
                                id: ticker_input
                                hint_text: "Ticker"
                                helper_text: "Enter symbol"
                                helper_text_mode: "on_focus"
                                font_name_hint_text: "Malgun"
                                font_name_helper_text: "Malgun"
                                font_name: "Malgun"
                                on_text_validate: app.add_stock()

                            MDRaisedButton:
                                text: "Add"
                                font_name: "Malgun"
                                on_release: app.add_stock()

                        MDLabel:
                            id: status_label
                            text: "Add a stock to start"
                            halign: "center"
                            theme_text_color: "Secondary"
                            adaptive_height: True
                            font_name: "Malgun"

                        MDBoxLayout:
                            orientation: 'horizontal'
                            adaptive_height: True
                            padding: [dp(16), 0, dp(16), 0]
                            spacing: dp(8)
                            
                            MDLabel:
                                text: "Sort By:"
                                size_hint_x: None
                                width: dp(60)
                                font_name: "Malgun"
                                theme_text_color: "Secondary"
                            
                            MDRaisedButton:
                                id: sort_button
                                text: "Ticker"
                                font_name: "Malgun"
                                size_hint_x: None
                                width: dp(100)
                                on_release: app.sort_menu.open()

                            MDLabel:
                                text: "Show:"
                                size_hint_x: None
                                width: dp(40)
                                font_name: "Malgun"
                                theme_text_color: "Secondary"
                            
                            MDRaisedButton:
                                id: rows_button
                                text: "10"
                                font_name: "Malgun"
                                size_hint_x: None
                                width: dp(50)
                                on_release: app.rows_menu.open()

                        MDBoxLayout:
                            id: table_container
                            orientation: 'vertical'
                            padding: [dp(8), dp(8), dp(8), dp(40)] # 하단 여백 추가
                            size_hint_y: 1

                MDBottomNavigationItem:
                    name: "screen_portfolio"
                    text: "Portfolio"
                    icon: "chart-pie"

                    MDBoxLayout:
                        orientation: 'vertical'
                        MDLabel:
                            text: "Portfolio Analysis Screen"
                            halign: "center"

                MDBottomNavigationItem:
                    name: "screen_advisor"
                    text: "AI Advisor"
                    icon: "robot"

                    MDBoxLayout:
                        orientation: 'vertical'
                        MDLabel:
                            text: "AI Advisor Screen"
                            halign: "center"
"""


class DividendApp(MDApp):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.backend = None
        self.menu = None
        self.sort_menu = None
        self.rows_menu = None
        self.data_table = None

    def build(self):
        font_path = os.path.join(os.path.dirname(__file__), "../../assets/fonts/malgun.ttf")
        LabelBase.register(name="Malgun", fn_regular=font_path)
        self.theme_cls.theme_style = "Dark"
        self.theme_cls.primary_palette = "BlueGray"
        self.theme_cls.font_styles["Body1"] = ["Malgun", 13, False, 0.15]
        self.theme_cls.font_styles["Subtitle1"] = ["Malgun", 13, False, 0.15]
        self.theme_cls.font_styles["Button"] = ["Malgun", 12, True, 0.15]
        
        self.backend = DividendBackend()
        root = Builder.load_string(KV)
        
        # 국가 선택 메뉴
        menu_items = [
            {"viewclass": "OneLineListItem", "text": "US", "on_release": lambda x="US": self.set_item(x)},
            {"viewclass": "OneLineListItem", "text": "KR", "on_release": lambda x="KR": self.set_item(x)},
        ]
        self.menu = MDDropdownMenu(caller=root.ids.country_button, items=menu_items, width_mult=2)
        
        return root

    def on_start(self):
        # 1. 정렬 메뉴 초기화
        sort_opts = ["Ticker", "Name", "Price", "Annual Yield", "1-Yr Return", "Last Ex-Div Date"]
        self.sort_menu = MDDropdownMenu(
            caller=self.root.ids.sort_button,
            items=[{"viewclass": "OneLineListItem", "text": opt, "on_release": lambda x=opt: self.apply_sort(x)} for opt in sort_opts],
            width_mult=3,
        )
        
        # 2. 페이지 크기 메뉴 초기화
        page_opts = ["5", "10", "20", "50"]
        self.rows_menu = MDDropdownMenu(
            caller=self.root.ids.rows_button,
            items=[{"viewclass": "OneLineListItem", "text": opt, "on_release": lambda x=opt: self.apply_rows_num(x)} for opt in page_opts],
            width_mult=2,
        )
        
        # 초기 데이터 로드
        self.refresh_table()

    def apply_rows_num(self, val):
        self.root.ids.rows_button.text = val
        self.rows_menu.dismiss()
        self.refresh_table(rebuild=True)

    def refresh_table(self, rebuild=False):
        saved_watchlist = self.backend.get_watchlist()
        rows = self.format_watchlist_data(saved_watchlist)
        
        # 설정된 컬럼 폭 가져오기
        settings = self.backend.get_settings()
        widths = settings.get("column_widths", {"ticker": 30, "name": 85, "price": 40, "yield": 45, "rtn": 45, "date": 55})
        
        current_rows_num = int(self.root.ids.rows_button.text)
        
        if not self.data_table or rebuild:
            if self.data_table:
                self.root.ids.table_container.remove_widget(self.data_table)
            
            self.data_table = MDDataTable(
                use_pagination=True,
                rows_num=current_rows_num,
                column_data=[
                    ("Ticker", dp(widths["ticker"])),
                    ("Name", dp(widths["name"])),
                    ("Price", dp(widths["price"])),
                    ("Annual Yield", dp(widths["yield"])),
                    ("1-Yr Return", dp(widths["rtn"])),
                    ("Last Ex-Div Date", dp(widths["date"]))
                ],
                row_data=rows,
                elevation=2,
                size_hint=(1, 1),
            )
            self.root.ids.table_container.add_widget(self.data_table)
        else:
            self.data_table.row_data = rows

    def format_watchlist_data(self, data_list):
        rows = []
        for item in data_list:
            rows.append((
                item["symbol"], item["name"],
                f"{item['currency']} {item['price']:,.2f}",
                f"{item['dividend_yield']:.2f}%",
                f"{item['one_yr_return']:.2f}%",
                item.get("ex_div_date", "-")
            ))
        return rows

    def apply_sort(self, option):
        self.root.ids.sort_button.text = option
        self.sort_menu.dismiss()
        
        watchlist = self.backend.get_watchlist()
        if not watchlist:
            return

        if option == "Ticker":
            watchlist.sort(key=lambda x: x.get("symbol", ""))
        elif option == "Name":
            watchlist.sort(key=lambda x: x.get("name", ""))
        elif option == "Price":
            watchlist.sort(key=lambda x: x.get("price", 0), reverse=True)
        elif option == "Annual Yield":
            watchlist.sort(key=lambda x: x.get("dividend_yield", 0), reverse=True)
        elif option == "1-Yr Return":
            watchlist.sort(key=lambda x: x.get("one_yr_return", 0), reverse=True)
        elif option == "Last Ex-Div Date":
            watchlist.sort(key=lambda x: x.get("ex_div_date", "0000-00-00"), reverse=True)
        
        self.refresh_table()

    def clear_status_message(self, dt):
        self.root.ids.status_label.text = ""

    def add_stock(self):
        ticker = self.root.ids.ticker_input.text.strip()
        country = self.root.ids.country_button.text
        
        # 입력창은 무조건 초기화 (요구사항)
        self.root.ids.ticker_input.text = ""
        
        if not ticker:
            return

        result = self.backend.add_to_watchlist(ticker, country)
        
        status_label = self.root.ids.status_label
        
        if result["success"]:
            data = result["data"]
            # 테이블에 행 추가
            self.data_table.add_row(
                (
                    data["symbol"],
                    data["name"],
                    f"{data['currency']} {data['price']:,.2f}",
                    f"{data['dividend_yield']:.2f}%",
                    f"{data['one_yr_return']:.2f}%",
                    data["ex_div_date"],
                )
            )
            
            status_label.text = result["message"]
            status_label.theme_text_color = "Primary"
        else:
            status_label.text = result["message"]
            status_label.theme_text_color = "Custom"
            status_label.text_color = (1, 0, 0, 1) # Red color
            
        # 5초 후 메시지 삭제 (기존 3초 -> 5초)
        Clock.unschedule(self.clear_status_message)
        Clock.schedule_once(self.clear_status_message, 5)


if __name__ == "__main__":
    DividendApp().run()