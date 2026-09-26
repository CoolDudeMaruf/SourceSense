import joblib
from micromlgen import port
import os

if __name__ == '__main__':
    model_path = 'app/ml/model.pkl'
    
    if not os.path.exists(model_path):
        print(f"Error: {model_path} not found.")
        exit(1)
        
    print(f"Loading {model_path}...")
    model = joblib.load(model_path)
    
    print("Porting model to C++...")
    classMap = {
        0: "humid_haze",
        1: "clean",
        2: "construction_dust",
        3: "vehicle_combustion",
        4: "waste_burning"
    }
    c_code = port(model, classmap=classMap)
    
    out_dir = '../edge_device'
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'model.h')
    
    with open(out_file, 'w') as f:
        f.write(c_code)
        
    print(f"Successfully exported model to {out_file} for TinyML deployment.")
