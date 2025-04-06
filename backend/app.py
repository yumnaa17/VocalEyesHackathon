import cv2
import torch
from flask import Flask, jsonify

app = Flask(__name__)


model = torch.hub.load('ultralytics/yolov5', 'yolov5s') 

@app.route('/detect')
def detect():
    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = model(frame_rgb)
    

    detections = []
    for *box, conf, cls in results.xyxy[0]:
        detections.append({
            "class": model.names[int(cls)],
            "confidence": float(conf),
            "bbox": [int(x) for x in box]  # [x1, y1, x2, y2]
        })
    
    cap.release()
    return jsonify({"objects": detections})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)