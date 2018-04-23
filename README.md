# Cinefile

## Overview

Node.js project that pulls movie or televison metadata based on a filename.

## Installation

```
npm install cinefile
```

## Use

A key from the [moviedb API](https://www.themoviedb.org/documentation/api) is required.

```
const cinefile = require('cinefile')({ moviedbKey: YOUR_MOVIEDB_KEY });
```

## Running Tests

You will need to set the enviroment variable `CINEFILE_MOVIEDB_KEY` beforehand:

In Windows Powershell
```
$Env:CINEFILE_MOVIEDB_KEY = "my_key"
```

In Linux
```
export CINEFILE_MOVIEDB_KEY = "my_key"
```

```
npm test
```