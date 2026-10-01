import joblib
from micromlgen import port
import os

def print_economic_analysis():
    """
    Economic Viability Analysis Module
    Demonstrates the cost-effectiveness of TinyML-powered edge sensors 
    compared to traditional monitoring stations.
    """
    print("\n" + "="*50)
    print("SourceSense Economic Viability Analysis")
    print("="*50)
    
    traditional_cost = 25000  # USD per station
    tinyml_node_cost = 150    # USD per edge node
    
    # 1 traditional station can be replaced by 166 TinyML nodes for the same cost
    node_ratio = int(traditional_cost / tinyml_node_cost)
    
    print(f"[Cost Comparison per Unit]")
    print(f"Traditional CAAQMS Station:   ${traditional_cost:,}")
    print(f"SourceSense TinyML Node:      ${tinyml_node_cost:,}")
    print(f"-> Cost Reduction Factor:     {node_ratio}x")
    
    print(f"\n[Bandwidth & Cloud Savings]")
    # Sending raw high-freq data vs sending inferences + aggregated data
    raw_bandwidth_mb = 100 * 30  # 100MB/day * 30 days
    tinyml_bandwidth_mb = 2 * 30 # 2MB/day * 30 days
    
    print(f"Traditional IoT (Raw Data):   {raw_bandwidth_mb} MB / month")
    print(f"TinyML Edge Processing:       {tinyml_bandwidth_mb} MB / month")
    print(f"-> Bandwidth Savings:         {100 - (tinyml_bandwidth_mb/raw_bandwidth_mb)*100:.1f}%")
    
    print(f"\n[Deployment Scale]")
    budget = 100000
    print(f"With a city budget of ${budget:,}:")
    print(f"- You can deploy {int(budget/traditional_cost)} Traditional Stations")
    print(f"- You can deploy {int(budget/tinyml_node_cost)} SourceSense Nodes")
    print("This allows for hyper-local, block-by-block source apportionment instead of city-wide averages.")
    print("="*50 + "\n")

if __name__ == '__main__':
    print_economic_analysis()
    
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
        4: "waste_burning",
        5: "industrial_emissions"
    }
    c_code = port(model, classmap=classMap)
    
    out_dir = '../edge_device'
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'model.h')
    
    with open(out_file, 'w') as f:
        f.write(c_code)
        
    print(f"Successfully exported model to {out_file} for TinyML deployment.")
