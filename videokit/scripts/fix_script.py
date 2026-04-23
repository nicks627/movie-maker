import json
import math

def process():
    try:
        with open('src/data/script.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        new_scenes = []
        for s in data['long']['scenes']:
            bg = s.get('bg_image', '')
            if 'quant-overfit-board' in bg:
                s['bg_image'] = 'assets/images/overfitting_danger.png'
            if 'quant-bionic-board' in bg:
                s['bg_image'] = 'assets/images/bionic_trader.png'
            
            text_len = len(s.get('subtitleText', ''))
            if text_len > 48:
                # Split
                text = s['subtitleText']
                mid = text_len // 2
                best_split = mid
                for split_char in ['。', '、', '！', '？', 'で、', 'が、', 'は、']:
                    idx = text.find(split_char, mid - 10)
                    if idx != -1 and idx < text_len - 5:
                        best_split = idx + len(split_char)
                        break
                
                s1 = dict(s)
                s1['text'] = s1['text'][:best_split]
                s1['subtitleText'] = s1['subtitleText'][:best_split]
                s1['speechText'] = s1['speechText'][:best_split]
                duration_ratio = best_split / text_len
                s1['duration'] = max(1, int(s['duration'] * duration_ratio))
                
                s2 = dict(s)
                s2['text'] = s2['text'][best_split:]
                s2['subtitleText'] = s2['subtitleText'][best_split:]
                s2['speechText'] = s2['speechText'][best_split:]
                s2['duration'] = max(1, s['duration'] - s1['duration'])
                s2['popups'] = []
                s2['se'] = []
                
                new_scenes.append(s1)
                new_scenes.append(s2)
            else:
                new_scenes.append(s)

        # Re-index
        current_time = 0
        for i, s in enumerate(new_scenes):
            s['id'] = f"scene_{i:02d}"
            s['voiceFile'] = f"quant_long_{s['id']}.wav"
            s['startTime'] = current_time
            current_time += s['duration']
            
        data['long']['scenes'] = new_scenes
        
        # update short version images
        for s in data['short']['scenes']:
            bg = s.get('bg_image', '')
            if 'quant-overfit-board' in bg:
                s['bg_image'] = 'assets/images/overfitting_danger.png'
            if 'quant-bionic-board' in bg:
                s['bg_image'] = 'assets/images/bionic_trader.png'
        
        with open('src/data/script.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print("Success!")
    except Exception as e:
        print("Error:", str(e))

process()
