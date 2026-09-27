import math
import unittest

from sized_inference import CALIBRATE, CEILING, PAGE, TEST, TRAIN, features, fit, infer, propose, solve, summarize


def observations(shapes):
    return [{"shape": shape, "peak_traced_bytes": 1000 + 1024 * sum(features(shape)[1:])} for shape in shapes]


class SizedInferenceTests(unittest.TestCase):
    def test_small_integer_inference_has_known_answer(self):
        # [-2, -1, 0] dot [-3, -2, -1] = 8; dot [0, 1, 2] = -1.
        self.assertEqual(infer((1, 3, 2)), 7)

    def test_dimensions_and_splits_are_bounded_and_disjoint(self):
        self.assertEqual(len(set(TRAIN + CALIBRATE + TEST)), len(TRAIN + CALIBRATE + TEST))
        for shape in ((0, 64, 4), (9, 512, 32), (True, 64, 4), (1, 513, 4), (1, 64)):
            with self.assertRaises(ValueError):
                features(shape)

    def test_linear_solver_recovers_known_coefficients_and_rejects_singular(self):
        result = solve([[1, 2, 3], [0, 1, 4], [5, 6, 0]], [14, 14, 17])
        for actual, expected in zip(result, [1, 2, 3], strict=True):
            self.assertAlmostEqual(actual, expected)
        with self.assertRaises(ValueError):
            solve([[1, 1, 1]] * 3, [1, 1, 1])

    def test_calibration_margin_and_unseen_shapes(self):
        model = fit(observations(TRAIN), observations(CALIBRATE))
        self.assertAlmostEqual(model["margin_bytes"], PAGE)
        for shape in TEST[:-1]:
            proposal = propose(model, shape)
            self.assertEqual(proposal["reason"], "size-prediction")
            self.assertFalse(proposal["apply"])
            self.assertEqual(proposal["bytes"] % PAGE, 0)
        self.assertEqual(propose(model, TEST[-1])["bytes"], CEILING)
        model["coefficients"][0] = math.nan
        self.assertEqual(propose(model, TEST[0])["reason"], "invalid-estimate")

    def test_evaluation_labels_cannot_be_used_for_fitting(self):
        with self.assertRaises(ValueError):
            fit(observations(TRAIN + TEST), observations(CALIBRATE))
        with self.assertRaises(ValueError):
            fit(observations(TRAIN), observations(TEST))

    def test_repetitions_require_same_shape_and_deterministic_output(self):
        shape = (1, 64, 4)
        trials = [{"shape": shape, "peak_traced_bytes": n, "checksum": 7} for n in (100, 120, 110)]
        self.assertEqual(summarize(shape, trials)["peak_traced_bytes"], 120)
        with self.assertRaises(ValueError):
            summarize(shape, trials[:2])
        trials[-1]["checksum"] = 8
        with self.assertRaises(ValueError):
            summarize(shape, trials)


if __name__ == "__main__":
    unittest.main()
