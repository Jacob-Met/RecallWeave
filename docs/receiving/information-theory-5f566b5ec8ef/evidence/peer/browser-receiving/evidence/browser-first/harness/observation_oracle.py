"""Compare actual exported observations with the frozen, independent Decimal90 oracle."""
import math

METRIC_MAP = {
    "entropyXBits": "hX", "entropyYBits": "hY", "jointEntropyBits": "hXY",
    "conditionalYGivenXBits": "hYGivenX", "conditionalXGivenYBits": "hXGivenY",
    "mutualInformationBits": "mutualInformation",
}

def approximately(actual, expected, field):
    if expected is None:
        assert actual is None, (field, actual, expected)
        return
    assert isinstance(actual, (int, float)) and not isinstance(actual, bool), (field, actual)
    assert math.isfinite(actual), (field, actual)
    target = float(expected)
    assert abs(actual - target) <= 5e-13, (field, actual, target)
    if field == "mutualInformationBits" and 0 < target < 1e-10:
        assert actual > 0 and abs(actual / target - 1) < 1e-12, (field, actual, target)

def fraction(actual, expected, field):
    assert actual["numerator"] == expected["reducedNumerator"], (field, actual, expected)
    assert actual["denominator"] == expected["reducedDenominator"], (field, actual, expected)
    approximately(actual["value"], expected["numerator"] / expected["denominator"], field)

def verify_model(model, case):
    expected = case["expected"]
    assert model["counts"] == expected["counts"], case["name"]
    assert model["total"] == expected["total"]
    assert len(model["rows"]) == expected["rowCount"]
    assert len(model["columns"]) == expected["columnCount"]
    for actual_name, expected_name in METRIC_MAP.items():
        approximately(model["metrics"][actual_name], expected["metrics"][expected_name], actual_name)
    assert model["independence"]["exact"] is expected["independentExactly"]
    for actual_rows, expected_counts, expected_probabilities, expected_conditionals, key in (
        (model["rows"], expected["rowTotals"], expected["rowProbabilities"], expected["yGivenX"], "conditionalY"),
        (model["columns"], expected["columnTotals"], expected["columnProbabilities"], expected["xGivenY"], "conditionalX"),
    ):
        for index, row in enumerate(actual_rows):
            assert row["count"] == expected_counts[index]
            fraction(row["probability"], expected_probabilities[index], key + str(index))
            actual_conditional, target = row[key], expected_conditionals[index]
            defined = target["distribution"] is not None
            assert actual_conditional["defined"] is defined
            if not defined:
                assert actual_conditional["probabilities"] is None
                assert actual_conditional["entropyBits"] is None
                assert actual_conditional["weightedEntropyBits"] == 0
            else:
                assert len(actual_conditional["probabilities"]) == len(target["distribution"])
                for i, probability in enumerate(actual_conditional["probabilities"]):
                    fraction(probability, target["distribution"][i], key + str(index) + "/" + str(i))
                approximately(actual_conditional["entropyBits"], target["entropyBits"], key + " entropy")
                approximately(actual_conditional["weightedEntropyBits"],
                              float(target["entropyBits"]) * row["count"] / expected["total"], key + " weighted")
    assert len(model["cells"]) == len(expected["cells"])
    expected_differences = [{"row":c["row"], "column":c["column"], "jointCrossProduct":c["crossProducts"][0],
                             "marginalCrossProduct":c["crossProducts"][1],
                             "difference":c["crossProducts"][0]-c["crossProducts"][1]}
                            for c in expected["cells"] if c["crossProducts"][0] != c["crossProducts"][1]]
    assert model["independence"]["factorizationDifferences"] == expected_differences
    for actual, cell in zip(model["cells"], expected["cells"]):
        assert (actual["row"], actual["column"], actual["count"]) == (cell["row"], cell["column"], cell["count"])
        fraction(actual["probability"], cell["jointProbability"], "cell probability")
        fraction(actual["independentProbability"], cell["independentProductProbability"], "product probability")
        assert (actual["jointCrossProduct"], actual["marginalCrossProduct"]) == tuple(cell["crossProducts"])
        assert actual["zeroProbability"] is cell["zeroCell"]
        for actual_name, expected_name in (
            ("surprisalBits", "surprisalBits"), ("pointwiseInformationBits", "pointwiseMutualInformationBits"),
            ("entropyContributionBits", "entropyContributionBits"), ("signedContributionBits", "mutualInformationContributionBits"),
        ):
            approximately(actual[actual_name], cell[expected_name], actual_name)
    return {"case":case["name"], "cells":len(model["cells"]), "allExactCountsFractionsCrossProducts":True,
            "allSixMetricsAndCellTerms":True, "exactIndependence":model["independence"]["exact"]}
