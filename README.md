# dEval-flask Submodule

The "dEval" project includes the Git submodule "dEval-flask". Below is a quick guide on how to clone this repository as a submodule within the larger "dEval" repository with the submodule "dEval-flask" cloned as a subdirectory inside it and then update the submodule pointer when changes are made.

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
   cd ..
   ```

4. **Stage the submodule update:**

   ```bash
   git add <path/to/submodule>
   ```

5. **Commit the change in the main repository:**

   ```bash
   git commit -m "Update submodule pointer to latest commit"
   ```

6. **Push the commit after pulling any updates from the main module:**

   ```bash
   git pull
   git push
   ```
## Pulling new code if you weren't the one that updated the submodule pointer
### (this will be most users)

Either:

1. **Accomplish in one step by executing:**

   ```bash
   git pull --recurse-submodules
   ```
   
Or:

2.  **In two steps (say, if you forgot and you just did a "git pull" initially):**

   ```bash
   git pull
   git submodule update --recursive
   ```

   Note that this assumes that you already initialized the submodule at some point in the past. Go back to "Method 2: Initialize After Cloning" if you haven't done this yet.
   
## Summary

- **Cloning:** Use `--recurse-submodules` for a new clone or initialize/update submodules manually after cloning if the `--recurse-submodules` flag was not used initially.
- **Updating:** Update the submodule directory and then stage and commit the change in the main repository. Until you do this, the main repository will continue to reference the older commit.
- If you don't care about the flask server, then don't worry about it, though.  You can always pull down the submodule at a later date using the steps above if you change your mind.

For more detailed information, refer to the [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules).

# Curl Examples

The following examples will demonstrate how to use the flask server and the Postgres database.

---
### Retrieve Token

curl -X POST -H "Content-Type: application/json" -d '{"user": "validator", "role": "validator"}' https://deval-flask.onrender.com/token

---
### Test LLM Connection

curl -X POST -H "Content-Type: application/json" -d '{"prompt": "What is the air speed velocity of a swallow"}' https://deval-flask.onrender.com/test

---
### Test Authorization Code

curl -X GET -H "Authorization: Bearer *your token here* https://deval-flask.onrender.com/protected

---
### Add a record to the database

TOKEN="\<*your token here*\>"

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "1c97c740-bba0-4d2e-8459-bf7c761531a2",
    "model_id": "7a18d370-41c1-4d9d-8135-93d8fc937317",
    "validator_id": "0d845dc3-8f91-4eb8-978f-474d5dc86643",
    "score": 93.5,
    "metrics": {
      "accuracy": 0.94,
      "latency_ms": 120
    },
    "evaluation_type": "primary",
    "hash": "0xabc123...",
    "evaluation_timestamp": "2024-03-30T15:00:00Z",
    "metadata": {
      "Target": 100.00,
      "goals": "return a json object with a sum of 7 and 93"
    }

  }' https://deval-flask.onrender.com/submit-score

---
### Retrieve All Scores

curl -X GET https://deval-flask.onrender.com/all_scores

### Retrieve Leaderboard

#### **To get the model rankings for all validators and all tests**:
curl -X GET https://deval-flask.onrender.com/leaderboard

#### **To get the model rankings for a specific validator and all tests**:
curl -X POST -H "Content-Type: application/json" -d '{"validator": "\<*validator id*\>"}'  https://deval-flask.onrender.com/leaderboard

#### **To get the model rankings for a specific test and all validators**:
curl -X POST -H "Content-Type: application/json" -d '{"test": "\<*test id*\>"}'  https://deval-flask.onrender.com/leaderboard

#### **To get all model rankings for a specific test and validator**:
curl -X POST -H "Content-Type: application/json" -d '{"test": "\<*test id*\>","validator": "\<*validator id*\>"}'  https://deval-flask.onrender.com/leaderboard
