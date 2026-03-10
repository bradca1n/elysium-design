<!-- ~500 tokens -->
# Fund Expert Error Catalog

Domain-specific mistakes for fund administration synthesis tasks.

## E-FE01: Applying Rules from Wrong Jurisdiction
- **Pattern:** Citing UCITS requirements for a Cayman fund, or CBI rules for a Luxembourg structure. Mixing regulatory frameworks across jurisdictions.
- **Fix:** Verify jurisdiction at SETUP GATE. Before every regulatory claim: which regulator? which statute? Check `domain/REGULATORY.md` jurisdiction sections.

## E-FE02: Not Distinguishing Must-Have from Nice-to-Have
- **Pattern:** Listing market practices alongside legal requirements without distinction. "2/20 fee structure" sounds mandatory but is market convention, not regulation.
- **Fix:** Label explicitly: "Required by [statute]" vs "Market practice" vs "Elysium design choice."

## E-FE03: Missing Exclusion Analysis
- **Pattern:** Documenting what's IN scope without documenting what's explicitly OUT. When scope eliminates 60% of complexity (e.g., Cayman vs UCITS), failing to document this loses the key product insight.
- **Fix:** Every output MUST include what's out of scope with reasons. This is a mandatory output element, not optional.

## E-FE04: No Coverage Validation Against Domain Files
- **Pattern:** Output covers 12 of 15 relevant domain areas without checking for the missing 3. Usually misses less obvious areas (dormant accounts, forced redemption, error scenarios, securities lending).
- **Fix:** At COMPLETION GATE, iterate ALL relevant domain files and check: addressed, excluded with reason, or not applicable.

## E-FE05: Duplicating Domain Content Instead of Cross-Referencing
- **Pattern:** Copy-pasting 500 lines from a domain file into a product spec. Creates two files to maintain — when domain knowledge is updated, the duplicate becomes stale.
- **Fix:** Cross-reference: "See `domain/X.md` Section Y for details." Only include scenario-specific adaptations or interpretations in the output.
