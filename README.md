# dEval-flask Submodule

The "dEval" project includes the Git submodule "dEval-flask". Below is a quick guide on how to clone this repository as a submodule within the larger "dEval" repository with the submodule "dEval-flask" cloned as a subdirectory within it and then update the submodule pointer when changes are made.

## Cloning the Repository with Submodules

When you clone the repository, include the submodules with one of the following methods:

### Method 1: Clone with Submodules

Clone the repository and initialize the submodule in one step:

```bash
git clone --recurse-submodules <repository-url>
```

### Method 2: Initialize After Cloning

If you cloned the repository without the `--recurse-submodules` flag, initialize and update the submodules with:

```bash
git pull
git submodule update --init --recursive
```

This command will initialize and update all submodules in the main repository, including nested submodules (if there are any).

## Updating the Submodule

The submodule is linked to a specific commit in the main repository. Even if you make changes within the submodule’s own repository, those changes will not be reflected in the main repository until you update the submodule pointer. Follow these steps to update it:

1. **Navigate to the submodule directory:**

   ```bash
   cd <path/to/submodule>
   ```

2. **Pull/Merge the latest changes in the submodule:**

   ```bash
   git pull
   ```

   If the submodule is set to track a specific branch, you might need to switch branches. Note that I plan to always use the "main" branch to populate the submodule.

   ```bash
   git checkout main
   git pull
   ```

3. **Return to the main repository's root directory:**

   ```bash
   cd ../..
   ```

4. **Stage the submodule update:**

   ```bash
   git add <path/to/submodule>
   ```

5. **Commit the change in the main repository:**

   ```bash
   git commit -m "Update submodule pointer to latest commit"
   ```

6. **Push the commit:**

   ```bash
   git push
   ```
## Pulling new code if you weren't the one that updated the submodule pointer
###(this will be most users)

Either:

1. **Accomplish in one step by executing:**

   ```bash
   git pull --recurse-submodules
   ```
   
Or:

2.  **In two steps (say, if you forgot and you just did a "git pull" initially):**

   ```bash
   git pull
   git submodule update --init --recursive
   ```

## Summary

- **Cloning:** Use `--recurse-submodules` for a new clone or initialize/update submodules manually after cloning if the `--recurse-submodules` flag was not used initially.
- **Updating:** Update the submodule directory and then stage and commit the change in the main repository. Until you do this, the main repository will continue to reference the older commit.
- If you don't care about the flask server, then don't worry about it, though.  You can always pull down the submodule at a later date using the steps above if you change your mind.

For more detailed information, refer to the [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules).
