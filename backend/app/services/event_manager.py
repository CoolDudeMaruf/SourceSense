from typing import Dict, Any

class EventManager:
    def __init__(self):
        self.events: Dict[int, Dict[str, Any]] = {}

    def process_reading(
        self,
        node_id: int,
        pm10: float,
        threshold: float,
        classifier_label: str,
        trust_score: float,
        timestamp,
        persistence_sec: int = 300
    ) -> str:
        """
        Process a reading and determine the event state based on persistence.
        States: NORMAL, UNCONFIRMED, CONFIRMED
        """
        if node_id not in self.events:
            self.events[node_id] = {
                "state": "NORMAL",
                "first_exceedance": None
            }
        
        ctx = self.events[node_id]
        
        # If below threshold, reset and return NORMAL
        if pm10 is None or pm10 < threshold:
            ctx["state"] = "NORMAL"
            ctx["first_exceedance"] = None
            return ctx["state"]
            
        # If above threshold and we haven't seen it before
        if ctx["first_exceedance"] is None:
            ctx["first_exceedance"] = timestamp
            ctx["state"] = "UNCONFIRMED"
            
        # If persistence time has passed or persistence is 0, set state to CONFIRMED immediately
        if persistence_sec == 0 or (timestamp - ctx["first_exceedance"]).total_seconds() >= persistence_sec:
            ctx["state"] = "CONFIRMED"
            
        return ctx["state"]

event_manager = EventManager()
