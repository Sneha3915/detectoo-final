import torch
from torchvision import transforms
from PIL import Image

from model.cnn_model import ForgeryCNN

# Device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Image Transform
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# Load Model
model = ForgeryCNN()

model.load_state_dict(
    torch.load(
        "weights/best_model.pth",
        map_location=device
    )
)

model.to(device)
model.eval()

classes = [
    "authentic",
    "tampered"
]


def predict_image(pil_image):

    image = transform(pil_image).unsqueeze(0).to(device)

    with torch.no_grad():

        outputs = model(image)

        probabilities = torch.softmax(outputs, dim=1)

        confidence, predicted = torch.max(probabilities, 1)

    return {
        "prediction": classes[predicted.item()],
        "confidence": round(confidence.item() * 100, 2)
    }