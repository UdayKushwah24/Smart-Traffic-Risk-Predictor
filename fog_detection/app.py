from fastapi import FastAPI, File, UploadFile
from PIL import Image
import torch
import timm
import torch.nn as nn
from torchvision import transforms
import io

app = FastAPI()

device = torch.device("cpu")

model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=2)
model.load_state_dict(torch.load("fog_model.pth", map_location=device))
model.eval()

transform = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ToTensor(),
    transforms.Normalize([0.5],[0.5])
])

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    img_tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        output = model(img_tensor)
        prob = torch.softmax(output, dim=1)
        confidence = prob.max().item()
        _, pred = torch.max(output, 1)

    label = "Clear" if pred.item() == 0 else "Fog/Smog"

    return {
        "prediction": label,
        "confidence": round(confidence * 100, 2)
    }
