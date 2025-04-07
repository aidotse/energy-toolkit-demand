# Constraint functions for scenarios

# If transport electrification is less than 0.5, then housing flex must be less than 0.5 (because there won't be enough batteries in peoples houses)
def low_transport_electrification_low_housing_flex(scenario):
    return (
        scenario["transport-electrification"] >= 0.5
        or scenario["housing-flex"] < 0.5
    )

# If growth is less than 0.5, then industry transition must be less than 0.5 (because in low growth scenarios, industry transition is likely to be slow)
def low_growth_low_industry_transition(scenario):
    return (
        scenario["growth"] >= 0.5
        or scenario["industry-transition"] < 0.5
    )