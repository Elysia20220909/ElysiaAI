import tempfile
import unittest
from pathlib import Path

from arena_policy_test import REJECTIONS, build_files, packet, rejection_errors
from sized_test import CASES, expected_pages, verdict
from test_sized_test import transcript


class ArenaPolicyTests(unittest.TestCase):
    def test_packet_keeps_identity_and_explicit_units(self):
        fixed = packet(bytes(range(32)))
        analytic = packet(bytes(range(32)), "analytic")
        self.assertEqual(len(analytic), 240)
        self.assertEqual(analytic[:16], b"EAB1\x01\x00\x01\x00\x0c\x00\x00\x00\x00\x00\x00\x00")
        self.assertEqual(analytic[16:48], bytes(range(32)))
        for i, shape in enumerate(CASES.values()):
            offset = 48 + i * 16
            self.assertEqual(int.from_bytes(analytic[offset : offset + 4], "little"), 75 + i)
            self.assertEqual(int.from_bytes(analytic[offset + 10 : offset + 12], "little"), expected_pages(shape))
            self.assertEqual(int.from_bytes(fixed[offset + 10 : offset + 12], "little"), 16)
        with self.assertRaises(ValueError):
            packet(b"short")
        with self.assertRaises(ValueError):
            packet(bytes(32), "unknown")
        for variant in REJECTIONS:
            self.assertNotEqual(packet(bytes(32), variant), packet(bytes(32)))

    def test_build_identity_comes_from_actual_elf(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            elf = root / "example.elf"
            elf.write_bytes(b"abc")
            policy, identity = build_files(elf, root, "analytic")
            expected = bytes.fromhex("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
            self.assertEqual(identity.read_bytes(), expected)
            self.assertEqual(policy.read_bytes()[16:48], expected)

    def test_rejection_cannot_hide_process_or_journal_side_effects(self):
        for variant, reason in REJECTIONS.items():
            output = f"kernel:arena-budget-rejected reason={reason}"
            self.assertEqual(rejection_errors(variant, 61, output), [])
            self.assertTrue(rejection_errors(variant, 53, output))
            self.assertTrue(rejection_errors(variant, 61, output + "\n" + output))
            for extra in (
                "kernel:user-enter pid=0",
                "kernel:agent-bound",
                "kernel:persist-ready",
                "kernel:arena-resize",
                "kernel:arena-budget-accepted",
                "panic",
            ):
                self.assertTrue(rejection_errors(variant, 61, output + "\n" + extra))

    def test_applied_budget_must_precede_authority_and_match_allocations(self):
        for case, shape in CASES.items():
            pages = expected_pages(shape)
            mode = 75 + list(CASES).index(case)
            marker = f"kernel:arena-budget-accepted mode={mode} pages={pages} metric=native-arena-pages"
            output = (
                marker
                + "\n"
                + transcript(case).replace("max-pages=16", f"max-pages={pages}").replace("limit=16", f"limit={pages}")
            )
            self.assertEqual(verdict(case, 53, output, arena_limit=pages, require_budget=True), [])
            for bad in (
                output.replace(marker, ""),
                output + "\n" + marker,
                output.replace(marker, "") + "\n" + marker,
                output.replace("metric=native-arena-pages", "metric=python-bytes"),
                output.replace(f"max-pages={pages}", "max-pages=16"),
            ):
                self.assertTrue(verdict(case, 53, bad, arena_limit=pages, require_budget=True))


if __name__ == "__main__":
    unittest.main()
