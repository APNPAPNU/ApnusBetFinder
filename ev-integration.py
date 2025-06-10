
# Add this to your existing EV finder script to output JSON data

import json

def export_opportunities_to_json(opportunities_list):
    """
    Convert your EV opportunities to JSON format for the web interface
    """
    json_data = []
    
    for opp in opportunities_list:
        json_data.append({
            "game": opp.get("game", ""),
            "start": opp.get("start", ""),
            "market": opp.get("market", ""),
            "line_display": opp.get("line_display", ""),
            "best_price": opp.get("best_price", 0),
            "best_book": opp.get("best_book", ""),
            "worst_price": opp.get("worst_price", 0),
            "worst_book": opp.get("worst_book", ""),
            "ev_pct": opp.get("ev_pct", 0),
            "value_score": opp.get("value_score", 0),
            "num_books": opp.get("num_books", 0)
        })
    
    return json_data

# Add this to the end of your main() function:
# json_opportunities = export_opportunities_to_json(all_opportunities)
# 
# # Save to file for web interface
# with open('ev_data.json', 'w') as f:
#     json.dump(json_opportunities, f, indent=2)
# 
# # Or upload to your API endpoint
# # requests.post('YOUR_API_ENDPOINT', json=json_opportunities)
