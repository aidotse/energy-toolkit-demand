# How the generator works

The generator is a general (and currently very loose) framework for producing electricity demand forcasts in a format that works for the frontend. It can be rewritten to produce forcasts in any way as long as the output follows this format:

TODO: fill in the file format
demand_t
demand

## Starting input

What are the different ways of producing forecasts envisioned here:

1. Start from existing forecasts and transform them
2. Start from demand profiles
