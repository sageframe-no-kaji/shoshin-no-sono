# Claude Design exports

Drop the artifacts Claude Design produces here, one subdirectory per session:

```
exports/
  session-1-peak/
    peak-tuner.html      ← the tuner itself (download the artifact) — it's an
                            instrument now, worth keeping and re-opening
    peak-final.svg       ← the frozen winner
    parameters.json      ← the Copy-parameters output at freeze
    rejected/            ← variants ruled out, kept for the record
```

After files land, the winner gets wired into `design/visual-register.html`
(its slot is waiting) and the parameter block there gets replaced by the
frozen `parameters.json`.
