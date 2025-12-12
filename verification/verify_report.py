from playwright.sync_api import sync_playwright
import json
import os
import re

def create_mock_html():
    with open('resources/html/report.html', 'r', encoding='utf-8') as f:
        html_content = f.read()

    # Define mock data matching the structure expected by the template
    mock_data = {
        "group_name": "Test Group",
        "date": "2023-10-27",
        "generated_time": "12:00:00",
        "summary": "This is a narrative summary of the day. The group was very active during lunch time, discussing the latest tech news. Sentiment was mostly positive with some chaos in the evening.",
        "sentiment": "Positive",
        "gamification": {
            "toxic": {
                "nightOwl": {"nickname": "OwlUser", "count": 50},
                "wordKing": {"nickname": "ChattyUser", "count": 1000},
                "repeater": {"nickname": "CopyCat", "count": 20},
                "dragonKing": {"nickname": "DragonUser", "count": 200}
            },
            "emojiWar": [
                {"url": "https://placehold.co/100x100?text=Emoji1", "count": 10},
                {"url": "https://placehold.co/100x100?text=Emoji2", "count": 8}
            ]
        },
        "group_bible": [
            {"quote": "This is a funny quote!", "user": "UserA", "context": "Context A"},
            {"quote": "Another funny quote.", "user": "UserB", "context": "Context B"}
        ],
        "mbti_analysis": [
            {"nickname": "UserC", "mbti": "INTJ", "description": "Analyzing everything."},
            {"nickname": "UserD", "mbti": "ENFP", "description": "Happy go lucky."}
        ],
        "heatmap": [0, 0, 0, 0, 5, 10, 20, 50, 80, 100, 120, 80, 60, 40, 20, 10, 5, 2, 0, 0, 10, 20, 5, 0],
        "wordcloud": [{"name": "Test", "value": 100}, {"name": "Code", "value": 80}, {"name": "AI", "value": 60}],
        "social": {
            "nodes": [
                {"id": "1", "name": "UserA", "value": 10},
                {"id": "2", "name": "UserB", "value": 20},
                {"id": "3", "name": "UserC", "value": 30}
            ],
            "links": [
                {"source": "1", "target": "2", "value": 5},
                {"source": "2", "target": "3", "value": 8}
            ]
        },
        "sentimentCurve": {
            "times": ["10:00", "11:00", "12:00", "13:00", "14:00"],
            "scores": [10, 20, 15, -5, 10]
        }
    }

    # Manual template replacement (simplified for this verification script)
    # Note: A real template engine would handle loops and conditionals better.
    # We will do a rough replacement for verification.

    replacements = {
        "{{group_name}}": mock_data["group_name"],
        "{{date}}": mock_data["date"],
        "{{generated_time}}": mock_data["generated_time"],
        "{{summary}}": mock_data["summary"],
        "{{sentiment}}": mock_data["sentiment"],
        "{{@heatmap}}": json.dumps(mock_data["heatmap"]),
        "{{@wordcloud}}": json.dumps(mock_data["wordcloud"]),
        "{{@social}}": json.dumps(mock_data["social"]),
        "{{@sentimentCurve}}": json.dumps(mock_data["sentimentCurve"]),

        # Simple conditional replacements
        "{{gamification.toxic.nightOwl.nickname}}": mock_data["gamification"]["toxic"]["nightOwl"]["nickname"],
        "{{gamification.toxic.nightOwl.count}}": str(mock_data["gamification"]["toxic"]["nightOwl"]["count"]),

        "{{gamification.toxic.wordKing.nickname}}": mock_data["gamification"]["toxic"]["wordKing"]["nickname"],

        "{{gamification.toxic.repeater.nickname}}": mock_data["gamification"]["toxic"]["repeater"]["nickname"],

        "{{gamification.toxic.dragonKing.nickname}}": mock_data["gamification"]["toxic"]["dragonKing"]["nickname"],
        "{{gamification.toxic.dragonKing.count}}": str(mock_data["gamification"]["toxic"]["dragonKing"]["count"]),
    }

    # Apply simple replacements
    for key, value in replacements.items():
        html_content = html_content.replace(key, value)

    # Handle Loops (Very rough regex hack for verification purposes)
    # We will just replace the entire loop blocks with pre-generated HTML for the mock items

    # Emoji War
    emoji_html = ""
    for idx, emoji in enumerate(mock_data["gamification"]["emojiWar"]):
        emoji_html += f"""
        <div class="emoji-item">
            <div class="emoji-img-container">
                <img src="{emoji['url']}" referrerpolicy="no-referrer" class="emoji-img" alt="Meme" />
            </div>
            <div class="emoji-rank">#{idx + 1} ({emoji['count']})</div>
        </div>"""
    html_content = re.sub(r'{{each gamification.emojiWar.*?{{/each}}', emoji_html, html_content, flags=re.DOTALL)

    # Group Bible
    bible_html = ""
    for bible in mock_data["group_bible"]:
        bible_html += f"""
        <div class="bible-card">
            <div class="bible-quote">{bible['quote']}</div>
            <div class="bible-meta">—— {bible['user']} ({bible['context']})</div>
        </div>"""
    html_content = re.sub(r'{{each group_bible.*?{{/each}}', bible_html, html_content, flags=re.DOTALL)

    # MBTI
    mbti_html = ""
    for user in mock_data["mbti_analysis"]:
        mbti_html += f"""
        <div class="mbti-item">
            <div class="mbti-tag">{user['mbti']}</div>
            <div style="flex: 1;">
                <div style="font-weight: bold;">{user['nickname']}</div>
                <div class="mbti-desc">{user['description']}</div>
            </div>
        </div>"""
    html_content = re.sub(r'{{each mbti_analysis.*?{{/each}}', mbti_html, html_content, flags=re.DOTALL)

    # Clean up any remaining conditionals (If statements)
    # For now, we assume true for the ones we care about and remove the tags
    html_content = re.sub(r'{{if.*?}}', '', html_content)
    html_content = re.sub(r'{{else}}.*?{{/if}}', '', html_content, flags=re.DOTALL) # Remove else block if we assume true
    html_content = re.sub(r'{{/if}}', '', html_content)

    # Save the processed HTML
    with open('verification/test_report.html', 'w', encoding='utf-8') as f:
        f.write(html_content)

    # Copy CSS
    with open('resources/html/report.css', 'r', encoding='utf-8') as f:
        css_content = f.read()
    with open('verification/report.css', 'w', encoding='utf-8') as f:
        f.write(css_content)

def verify_report(page):
    # Load the generated HTML file
    file_path = os.path.abspath('verification/test_report.html')
    page.goto(f'file://{file_path}')

    # Wait for echarts to render (give it a moment)
    page.wait_for_timeout(2000)

    # Assert title exists
    assert page.locator('h1').inner_text() == "Test Group"

    # Take screenshot
    page.screenshot(path='verification/report_screenshot.png', full_page=True)

if __name__ == "__main__":
    create_mock_html()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 600, 'height': 800}) # Mimic the container width
        verify_report(page)
        browser.close()
