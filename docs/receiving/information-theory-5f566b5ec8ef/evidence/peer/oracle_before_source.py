"""Independent pre-implementation oracle. No RecallWeave source is imported."""
from __future__ import annotations
from decimal import Decimal, localcontext
from fractions import Fraction
from pathlib import Path
import hashlib
import itertools
import json
import random
import sys

PRECISION = 90
ZERO = Decimal(0)
ONE = Decimal(1)
TOL = Decimal("1e-75")

def admitted(matrix):
    if type(matrix) is not list or not 2 <= len(matrix) <= 4:
        raise ValueError("2-4 rows")
    if any(type(row) is not list for row in matrix):
        raise ValueError("row arrays")
    columns = len(matrix[0])
    if not 2 <= columns <= 4 or any(len(row) != columns for row in matrix):
        raise ValueError("rectangular 2-4 columns")
    if any(type(n) is not int or not 0 <= n <= 999 for row in matrix for n in row):
        raise ValueError("strict bounded integers")
    if not sum(map(sum, matrix)):
        raise ValueError("positive total")
    return matrix

def fraction(n, d):
    q = Fraction(n, d)
    return {"numerator": n, "denominator": d,
            "reducedNumerator": q.numerator, "reducedDenominator": q.denominator}

def decimal_fraction(n, d):
    return Decimal(n) / Decimal(d)

def log2(q):
    assert q > 0
    return q.ln() / Decimal(2).ln()

def entropy(counts):
    total = sum(counts)
    assert total > 0
    return sum((-decimal_fraction(n, total) * log2(decimal_fraction(n, total))
                for n in counts if n), ZERO)

def number(n):
    # Decimal comparisons are unrounded internally; output is exact textual oracle precision.
    return str(n if n else ZERO)

def conditional(group):
    total = sum(group)
    if not total:
        return {"givenCount": 0, "distribution": None, "entropyBits": None}
    return {"givenCount": total, "distribution": [fraction(n, total) for n in group],
            "entropyBits": number(entropy(group))}

def observation(matrix):
    admitted(matrix)
    matrix = [list(row) for row in matrix]
    with localcontext() as ctx:
        ctx.prec = PRECISION
        nr, nc = len(matrix), len(matrix[0])
        rows = [sum(row) for row in matrix]
        cols = [sum(matrix[i][j] for i in range(nr)) for j in range(nc)]
        total = sum(rows)
        cells = []
        mutual = ZERO
        for i, j in itertools.product(range(nr), range(nc)):
            n = matrix[i][j]
            p = decimal_fraction(n, total)
            product = decimal_fraction(rows[i] * cols[j], total * total)
            if n:
                surprise = -log2(p)
                pointwise = log2(Decimal(n * total) / Decimal(rows[i] * cols[j]))
                hterm, iterm = p * surprise, p * pointwise
            else:
                surprise = pointwise = None
                hterm = iterm = ZERO
            mutual += iterm
            cells.append({
                "row": i, "column": j, "count": n,
                "jointProbability": fraction(n, total),
                "independentProductProbability": fraction(rows[i] * cols[j], total * total),
                "crossProducts": [n * total, rows[i] * cols[j]],
                "surprisalBits": None if surprise is None else number(surprise),
                "pointwiseMutualInformationBits": None if pointwise is None else number(pointwise),
                "entropyContributionBits": number(hterm),
                "mutualInformationContributionBits": number(iterm),
                "zeroCell": n == 0,
            })
        y_given_x = [conditional(row) for row in matrix]
        x_given_y = [conditional([matrix[i][j] for i in range(nr)]) for j in range(nc)]
        hy_x = sum((decimal_fraction(rows[i], total) * entropy(matrix[i])
                    for i in range(nr) if rows[i]), ZERO)
        hx_y = sum((decimal_fraction(cols[j], total) *
                    entropy([matrix[i][j] for i in range(nr)])
                    for j in range(nc) if cols[j]), ZERO)
        hx, hy, hxy = entropy(rows), entropy(cols), entropy(list(itertools.chain.from_iterable(matrix)))
        assert abs(hx + hy_x - hxy) < TOL
        assert abs(hy + hx_y - hxy) < TOL
        assert abs(hx + hy - hxy - mutual) < TOL
        assert abs(hy - hy_x - mutual) < TOL
        assert abs(hx - hx_y - mutual) < TOL
        assert -TOL <= mutual <= min(hx, hy) + TOL
        assert hx <= log2(Decimal(nr)) + TOL and hy <= log2(Decimal(nc)) + TOL
        independence = all(c["crossProducts"][0] == c["crossProducts"][1] for c in cells)
        if independence:
            assert abs(mutual) < TOL
        return {
            "counts": matrix, "rowCount": nr, "columnCount": nc, "total": total,
            "rowTotals": rows, "columnTotals": cols,
            "rowProbabilities": [fraction(n, total) for n in rows],
            "columnProbabilities": [fraction(n, total) for n in cols],
            "cells": cells, "yGivenX": y_given_x, "xGivenY": x_given_y,
            "metrics": {"hX": number(hx), "hY": number(hy), "hXY": number(hxy),
                        "hYGivenX": number(hy_x), "hXGivenY": number(hx_y), "mutualInformation": number(mutual)},
            "independentExactly": independence,
        }

MANUAL = [
    ("independent", [[1, 1], [1, 1]]),
    ("balanced_copy", [[2, 0], [0, 2]]),
    ("biased_copy", [[3, 0], [0, 1]]),
    ("anticorrelation", [[0, 1], [1, 0]]),
    ("coarsening", [[1, 0], [1, 0], [0, 1], [0, 1]]),
    ("noisy", [[3, 1], [1, 3]]),
    ("rare", [[8, 0], [1, 1]]),
    ("padded_constant", [[7, 0, 0], [0, 0, 0], [0, 0, 0]]),
    ("padded_variable", [[1, 0, 0], [1, 0, 0], [0, 0, 0]]),
    ("maximum", [[999] * 4 for _ in range(4)]),
]

def check_manual(records):
    by = {x["name"]: x["expected"] for x in records}
    def metrics(name, values):
        actual = by[name]["metrics"]
        for key, want in zip(("hX", "hY", "hXY", "hYGivenX", "hXGivenY", "mutualInformation"), values):
            assert abs(Decimal(actual[key]) - want) < TOL, (name, key, actual[key], want)
    with localcontext() as ctx:
        ctx.prec = PRECISION
        hquarter = -(Decimal(1) / 4) * log2(Decimal(1) / 4) - (Decimal(3) / 4) * log2(Decimal(3) / 4)
        metrics("independent", [ONE, ONE, Decimal(2), ONE, ONE, ZERO])
        metrics("balanced_copy", [ONE, ONE, ONE, ZERO, ZERO, ONE])
        metrics("biased_copy", [hquarter, hquarter, hquarter, ZERO, ZERO, hquarter])
        metrics("anticorrelation", [ONE, ONE, ONE, ZERO, ZERO, ONE])
        metrics("coarsening", [Decimal(2), ONE, Decimal(2), ZERO, ONE, ONE])
        metrics("noisy", [ONE, ONE, ONE + hquarter, hquarter, hquarter, ONE - hquarter])
        metrics("padded_constant", [ZERO] * 6)
        metrics("padded_variable", [ONE, ZERO, ONE, ZERO, ONE, ZERO])
        metrics("maximum", [Decimal(2), Decimal(2), Decimal(4), Decimal(2), Decimal(2), ZERO])
        noisy = by["noisy"]
        for index in (1, 2):
            assert Decimal(noisy["cells"][index]["mutualInformationContributionBits"]) == -Decimal(1) / 8
        rare = by["rare"]
        assert Decimal(rare["yGivenX"][1]["entropyBits"]) == 1
        assert Decimal(rare["metrics"]["hYGivenX"]) == Decimal(1) / 5
        assert Decimal(rare["metrics"]["hY"]) < Decimal(rare["yGivenX"][1]["entropyBits"])
        assert by["padded_constant"]["yGivenX"][1]["distribution"] is None
        assert by["padded_variable"]["xGivenY"][1]["entropyBits"] is None

def generate():
    manual = [{"name": name, "expected": observation(matrix)} for name, matrix in MANUAL]
    check_manual(manual)
    corpus = list(manual)
    for ns in itertools.product(range(4), repeat=4):
        if any(ns):
            corpus.append({"name": "small_" + "".join(map(str, ns)), "expected": observation([list(ns[:2]), list(ns[2:])])})
    rng = random.Random(20261008)
    for index in range(48):
        nr, nc = rng.randrange(2, 5), rng.randrange(2, 5)
        matrix = [[rng.randrange(1000) if rng.randrange(3) else 0 for _ in range(nc)] for _ in range(nr)]
        if not sum(map(sum, matrix)):
            matrix[0][0] = 1
        corpus.append({"name": f"seeded_{index}", "expected": observation(matrix)})
    # Independent mathematical metamorphic checks use the oracle only; candidate challenge is later.
    for item in manual:
        original = item["expected"]; a = original["counts"]
        transpose = observation([list(x) for x in zip(*a)])
        assert transpose["metrics"]["hX"] == original["metrics"]["hY"]
        assert transpose["metrics"]["hY"] == original["metrics"]["hX"]
        for key in ("hXY", "mutualInformation"):
            assert abs(Decimal(transpose["metrics"][key]) - Decimal(original["metrics"][key])) < TOL
        permuted = observation([list(reversed(x)) for x in reversed(a)])
        for key, value in original["metrics"].items():
            assert abs(Decimal(permuted["metrics"][key]) - Decimal(value)) < TOL
        if max(map(max, a)) <= 333:
            scaled = observation([[n * 3 for n in row] for row in a])
            for key, value in original["metrics"].items():
                assert abs(Decimal(scaled["metrics"][key]) - Decimal(value)) < TOL
            assert scaled["independentExactly"] == original["independentExactly"]
    invalid = [None, [], [[1, 1]], [[1], [1]], [[1, 1], [1]], [[0, 0], [0, 0]],
               [[True, 0], [0, 1]], [["1", 0], [0, 1]], [[1.5, 0], [0, 1]],
               [[-1, 0], [0, 1]], [[1000, 0], [0, 1]], [[None, 0], [0, 1]],
               [[1, 1]] * 5, [[1] * 5, [1] * 5]]
    for matrix in invalid:
        try:
            admitted(matrix)
        except ValueError:
            pass
        else:
            raise AssertionError(("invalid accepted", matrix))
    return {"schema": "recallweave.information-theory.independent-oracle.v1",
            "precisionDecimalDigits": PRECISION, "seed": 20261008,
            "generatedBeforeProductSourceRead": True, "cases": corpus,
            "invalidJSONMatrices": invalid,
            "binary64Comparison": {"absoluteTolerance": 5e-13,
                                   "exactFields": "counts, dimensions, totals, integer fraction/cross-product identities, independence, null conditional state",
                                   "nullableZeroCell": "surprisal and pointwise MI must not be fabricated as finite0; separate zero summands remain0"}},
    
if __name__ == "__main__":
    target = Path(sys.argv[1])
    assert not target.exists(), "Do not overwrite a frozen oracle"
    result = generate()[0]
    raw = (json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    print(json.dumps({"phase": "independent-oracle-self-check", "cases": len(result["cases"]),
                      "manualCases": len(MANUAL), "invalidCases": len(result["invalidJSONMatrices"]),
                      "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}), flush=True)
    target.write_bytes(raw)
