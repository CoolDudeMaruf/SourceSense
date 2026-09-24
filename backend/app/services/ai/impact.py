"""
SourceSense – Counterfactual / Impact Estimation.
"""
def evaluate_impact(pm_before: float, pm_after: float, forecast_at_start: dict) -> dict:
    """
    Compare actual result against what we expected to happen (the counterfactual).
    """
    if pm_before is None or pm_after is None:
        return {}
        
    # Simplistic counterfactual: if we didn't spray, PM would have reached the 10m forecast or stayed at pm_before
    # Let's say we expect it to be 20% higher than pm_before if there was a positive trend
    estimated_baseline = pm_before * 1.1 # Dummy logic for counterfactual baseline
    if forecast_at_start and forecast_at_start.get("forecast_10m"):
         estimated_baseline = max(pm_before, forecast_at_start["forecast_10m"])
         
    reduction = max(0, estimated_baseline - pm_after)
    effectiveness_pct = (reduction / estimated_baseline) * 100.0 if estimated_baseline > 0 else 0
    
    return {
        "estimated_baseline": round(estimated_baseline, 1),
        "actual_reduction": round(reduction, 1),
        "effectiveness_pct": round(effectiveness_pct, 1)
    }
