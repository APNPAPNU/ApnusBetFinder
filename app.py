from flask import Flask, render_template, make_response
from flask_frozen import Freezer
import requests
import pandas as pd
from datetime import datetime
import sys

app = Flask(__name__)
freezer = Freezer(app)

def fetch_prematch_data():
    url = "https://49pzwry2rc.execute-api.us-east-1.amazonaws.com/prod/getLiveGames?sport=Soccer&live=false"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        response = requests.get(url)
        response.raise_for_status()
        json_data = response.json()
        prematch_games = json_data.get('body', {})

        flattened_data = []
        for game_id, game in prematch_games.items():
            game_base = {
                'game_id': game.get('game_id', ''),
                'game_date': game.get('game_date', ''),
                'game_name': game.get('game_name', ''),
                'sport': game.get('sport', ''),
                'league': game.get('league', ''),
                'home_team': game.get('home_team', ''),
                'away_team': game.get('away_team', ''),
                'player_1': game.get('player_1', ''),
                'player_2': game.get('player_2', ''),
                'event_name': game.get('event_name', ''),
                'player_names': game.get('player_names', '')
            }
            for market_id, market in game.get('markets', {}).items():
                market_base = {
                    'market_id': market.get('market_id', ''),
                    'market_type': market.get('market_type', ''),
                    'market_display_name': market.get('display_name', '')
                }
                for outcome_id, outcome in market.get('outcomes', {}).items():
                    best_odd = outcome.get('best_odd', {})
                    book_key = list(best_odd.keys())[0] if best_odd else ''
                    odd_details = best_odd.get(book_key, [{}])[0] if book_key else {}
                    row = {
                        **game_base,
                        **market_base,
                        'outcome_id': outcome.get('outcome_id', ''),
                        'outcome_type': outcome.get('outcome_type', ''),
                        'outcome_display_name': outcome.get('display_name', ''),
                        'has_alt': outcome.get('has_alt', False),
                        'odd_timestamp': odd_details.get('timestamp', ''),
                        'spread': odd_details.get('spread', 0.0),
                        'american_odds': odd_details.get('american_odds', 0.0),
                        'book': odd_details.get('book', '')
                    }
                    flattened_data.append(row)

        df = pd.DataFrame(flattened_data)
        columns = [
            'game_id', 'game_date', 'game_name', 'sport', 'league', 'home_team', 'away_team',
            'player_1', 'player_2', 'event_name', 'player_names', 'market_id', 'market_type',
            'market_display_name', 'outcome_id', 'outcome_type', 'outcome_display_name',
            'has_alt', 'book', 'spread', 'american_odds', 'odd_timestamp'
        ]
        df = df[columns]
        return df, None, timestamp
    except requests.exceptions.RequestException as e:
        return None, f"Request failed: {str(e)}", timestamp
    except ValueError:
        return None, "Response is not JSON", timestamp

@app.route('/')
def index():
    df, error, timestamp = fetch_prematch_data()
    if error:
        return render_template('error.html', error=error, timestamp=timestamp)
    table = df.to_html(classes='data', header=True, index=False)
    return render_template('index.html', table=table, timestamp=timestamp)

@app.route('/download')
def download_csv():
    df, error, timestamp = fetch_prematch_data()
    if error:
        return f"Error: {error}"
    csv = df.to_csv(index=False)
    response = make_response(csv)
    response.headers["Content-Disposition"] = f"attachment; filename=Soccer_prematch_data_{timestamp.replace(' ', '_').replace(':', '')}.csv"
    response.headers["Content-Type"] = "text/csv"
    return response

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'build':
        df, error, timestamp = fetch_prematch_data()
        if not error:
            csv_filename = 'build/soccer_prematch_data.csv'
            df.to_csv(csv_filename, index=False)
        freezer.freeze()
    else:
        app.run(debug=True)
