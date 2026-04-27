import soundfile as sf
import re

class TTSSegment:
    def __init__(self, start: float, end: float, text: str):
        self.start = start
        self.end = end
        self.text = text

def extract_timestamps_heuristic(audio_path: str, text: str) -> list[TTSSegment]:
    # 1. Get total duration
    info = sf.info(audio_path)
    total_sec = info.duration

    # 2. Split text into words while keeping punctuation attached
    # Regex to split by spaces but keep punctuation attached to words
    words = [w for w in text.split(" ") if w.strip()]
    if not words:
        return []

    # 3. Calculate weights based on characters and punctuation pauses
    total_weight = 0
    word_weights = []
    
    for word in words:
        # Base weight is number of characters (excluding punctuation)
        clean_word = re.sub(r'[^\w\s]', '', word)
        char_weight = len(clean_word) if clean_word else 1
        
        # Add extra weight for punctuation (pauses)
        pause_weight = 0
        if word.endswith(',') or word.endswith(';'):
            pause_weight = 3  # ~ 3 chars worth of pause
        elif word.endswith('.') or word.endswith('!') or word.endswith('?'):
            pause_weight = 6  # ~ 6 chars worth of pause
            
        weight = char_weight + pause_weight
        word_weights.append((word, weight))
        total_weight += weight

    # 4. Distribute total duration proportionally
    sec_per_weight = total_sec / total_weight if total_weight > 0 else 0
    
    segments = []
    current_time = 0.0
    for word, weight in word_weights:
        duration = weight * sec_per_weight
        segments.append(TTSSegment(start=current_time, end=current_time + duration, text=word))
        current_time += duration
        
    return segments

# Test it
if __name__ == "__main__":
    # Create a dummy wav file
    import numpy as np
    dummy_audio = np.zeros(16000 * 2) # 2 seconds
    sf.write("dummy.wav", dummy_audio, 16000)
    
    segs = extract_timestamps_heuristic("dummy.wav", "Xin chào các bạn, mình là Nhật Phong.")
    for s in segs:
        print(f"[{s.start:.2f} - {s.end:.2f}] {s.text}")
