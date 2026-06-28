import torch.nn as nn
from torchvision import models


class ForgeryCNN(nn.Module):
    def __init__(self):
        super(ForgeryCNN, self).__init__()

        # Load pretrained EfficientNet-B0
        self.model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)

        # Replace the final classification layer
        in_features = self.model.classifier[1].in_features

        self.model.classifier[1] = nn.Linear(in_features, 2)

    def forward(self, x):
        return self.model(x)