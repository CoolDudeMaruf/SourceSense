"""
SourceSense – Safety & Failsafe Layer.
"""
import logging

logger = logging.getLogger(__name__)

def safety_gate(node_id: int, control_mode: str, optimizer_decision: dict) -> dict:
    """
    Validates AI recommendation against safety constraints.
    Modes: MANUAL, SIMULATION, AUTONOMOUS.
    """
    action = optimizer_decision.get("action", "NONE")
    
    if action == "NONE":
        return {"relay_action": "OFF", "reason": "Optimizer says NONE", "is_safe": True}
        
    confidence = optimizer_decision.get("confidence", 0)
    reason = optimizer_decision.get("reason", "")
    
    # Safety Constraint 1: Minimum Combined Confidence (50% trust * 50% classifier = 25.0% combined)
    if confidence < 25.0:
        msg = f"Safety Block: Combined confidence too low ({confidence:.1f}%). {reason}"
        logger.warning(msg)
        return {"relay_action": "OFF", "reason": msg, "is_safe": False}
        
    # Mode Handling
    if control_mode == "MANUAL":
        msg = f"Manual Mode Active. AI suggested {action} but hardware control is manual."
        return {"relay_action": "OFF", "reason": msg, "is_safe": True} # Action depends on manual override elsewhere
        
    elif control_mode == "SIMULATION":
        msg = f"SIMULATION: {reason} (Would trigger {action} for {optimizer_decision.get('duration_min')} min at {optimizer_decision.get('intensity')}%)"
        return {"relay_action": "ON", "reason": msg, "is_safe": True, "simulated": True}
        
    elif control_mode == "AUTONOMOUS":
        if confidence >= 70.0:
            msg = f"Autonomous intervention allowed. {reason}"
            return {"relay_action": "ON", "reason": msg, "is_safe": True, "simulated": False}
        elif confidence >= 25.0:
            msg = f"Conservative intervention allowed. {reason}"
            return {"relay_action": "ON", "reason": msg, "is_safe": True, "simulated": False}
        else:
            msg = f"Safety Block: Confidence marginal ({confidence:.1f}%). Need gather evidence."
            return {"relay_action": "OFF", "reason": msg, "is_safe": False}
            
    return {"relay_action": "OFF", "reason": "Unknown control mode", "is_safe": False}
