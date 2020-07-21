# Contributing to Heatflask
For setting up the backend-server, see the [`README.md`](/backend/README.md) in [`/backend`](/backend), and for the frontend, see [`README.md`](/frontend/README.md) in [`/frontend`](/frontend).

If you are new to this, here's a tip.  First, [fork the repo](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo). Afterwards you will have your own copy of it.  Then [clone your fork of the repo](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) to your own machine.  Then navigate to the directory of the clone you made, in a terminal, and enter `git remote -v`.  That is the location of your remote repo, and its nickname is `origin` by default. You will add another remote, the main heatflask repo, which we call the `upstream` repo.
```bash
git remote add upstream git@github.com:ebrensi/heatflask.git
```

When you want to update your local repo, pull from `upstream` (eg `git pull upstream master` for the master branch).
When you have committed changes and want to update your remote repo, push to `origin` (eg `git push origin master`).
For more info, [take a look here](https://stackoverflow.com/questions/9257533/what-is-the-difference-between-origin-and-upstream-on-github).

## Code Style Guidelines
### Client-side (frontend)
For Linting we use [ESLint](https://eslint.org) (error checking only) and for consistent styling we use [prettier](https://prettier.io).

When you install frontend dependencies with `npm install`, ESLint and Prettier are installed for you as a dev-dependencies and convenient `npm` scripts to use them are defined in [`package.json`](/frontend/package.json). You can then integrate it with whatever IDE you like.

### Server-side (backend)
More here later.


### Making a Pull Request
#### Create an issue first
A [pull request](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests) is a request to have your changes merged into the codebase.

The way this works is that if you have an idea for a new feature, [create an issue](https://github.com/ebrensi/heatflask/issues).   If you found a bug, see if there is already an [issue](https://github.com/ebrensi/heatflask/issues) about it.  If there is not, create one.

### Make the PR
After you have made changes to your local repo and pushed them up to your `origin` remote on Github, you can make a pull-request on Github.👍

🔥 Thanks 🔥
