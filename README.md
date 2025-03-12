# Behovskartan

This repo contains Behovskartan starting from version 2.0 and is developed in collaboration with Energimyndigheten. The project aims to develop a framework for modelling, analyzing, and communicating future electricity demand.

The framework should be:

+ Open-source: with public data, but it should also allow for internal use with proprietary/confidential data and knowledge
+ Useful: it should provide insights to non-experts and be a powerful tool for experts 
+ Portable: it should be easy to set up, modify, and deploy in various environments
+ Secure: we assure security through simplicity, with file-based data and models

## Uses cases

_This is an initial desciption that will be refined._

+ General user: can explore and analyze future demand through visual interface (frontend)
+ Non-technical expert: can dig deeper into the data and use their own tools for analysis (frontend + api)
+ Technical expert: can alter the models and generate new output (demand + api + frontend)

The frontend is furthermore built with future development in mind. It is relatively simple to adapt the frontend for additional analytics or different data.

## Modelling philosophy

This project takes the view that the best foundation for modelling future demand is the current demand. The (future) demand projections in this project are therefore transformations of historical (actual) electricity demand. The transformations are modular and can be freely combined to produce scenarios.


### Work left to do

The intent has been to create a framework that will allow for any method of modelling future demand. **This goal has not been fully realized.** More work is needed to generalize the framework in future versions.

## Structure of the repo

This repo is divided into three parts.
├── api
├── demand
│   ├── generator
│   ├── input
│   └── transformers
└── frontend

### api

This folder contains the csv output from the demand application. This may be used as a file-based API, or else deployed to a web API. The contents of this directory is not tracked in the repo.

Each csv files contains a 1-year timeseries of electricity demand for a given year, geography, resolution, and scenario (represented by a set of parameters).

### demand

This folder contains the demand-modelling application. A generator takes configs as input and produces output in the api folder. The config describes each scenario as a combination of specified input data, transformations applied, and parameters.

Input data is stored in the folders input/private and input/public. Notebooks and other code specific to a type of data is stored alongside the data files, while code that runs in each scenario should be placed in /transformers.

#### Transformer types

- over time
- geographical
- sectorial

### frontend

This contains a frontend Svelte app that uses Mapbox GL as a foundational UI.

TODO: we have not yet determined whether the frontend can be a thin client-side application or whether a server is needed.

# Open source and confidentiality

The code in this repo is released under LICENSE HERE. It contains some data and models that are publicly available. But the application is also intended to be used with proprietary or confidential data and models.

The demand framework has two directories for input and models, each divided into a public and private part. Input and models placed in the private folder will be ignored by git unless the local .gitignore files is edited.

demand
├── generator
├── input
│   ├── private
│   └── public
└── models
    ├── private
    └── public

NOTE: Make sure to not reveal proprietary information in file names as these may be included in public configs in the generator.
