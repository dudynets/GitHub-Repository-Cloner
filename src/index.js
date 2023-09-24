import axios from 'axios';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import gitClone from 'git-clone';
import chalk from 'chalk';

// Function to prompt for user or organization and GitHub username
async function getUserInput() {
  const input = await inquirer.prompt([
    {
      type: 'list',
      name: 'entity',
      message: 'Clone repositories for a user or organization?',
      choices: ['User', 'Organization'],
    },
    {
      type: 'input',
      name: 'username',
      message: 'Enter the GitHub username:',
    },
  ]);

  input.username = input.username.trim();
  input.username = input.username.replace(/^@/g, '');

  if (
    !input.username ||
    !input.username.match(
      /\B([a-z0-9](?:-(?=[a-z0-9])|[a-z0-9]){0,38}(?<=[a-z0-9]))/gi,
    )
  ) {
    console.error(chalk.red('\nℹ Please enter a valid GitHub username.'));
    process.exit(1);
  }

  return input;
}

// Function to fetch repositories
async function fetchRepositories(entity, username) {
  console.log(
    chalk.yellow(
      `\nℹ Fetching ${entity.toLowerCase()} repositories for @${username}...`,
    ),
  );

  const entityMap = new Map([
    ['User', 'users'],
    ['Organization', 'orgs'],
  ]);

  try {
    const response = await axios.get(
      `https://api.github.com/${entityMap.get(entity)}/${username}/repos`,
    );
    const repositories = response.data;

    if (repositories.length === 0) {
      console.error(
        chalk.red(`\nℹ ${entity} @${username} has no public repositories.`),
      );
      process.exit(1);
    }

    return repositories;
  } catch (error) {
    if (error.response.status === 404) {
      console.error(
        chalk.red(
          `\nℹ ${entity} @${username} not found. Please check the username and try again.`,
        ),
      );
    } else {
      console.error(
        chalk.red(
          `\nℹ ${entity} @${username} could not be fetched. Please check the username and try again.`,
        ),
      );
    }
    process.exit(1);
  }
}

// Function to clone repositories
async function cloneRepositories(repositories, entity, username) {
  try {
    console.log(
      chalk.yellow(
        `ℹ Cloning ${entity.toLowerCase()} repositories for @${username}...`,
      ),
    );

    const outputFolder = `dumps/${entity.toLowerCase()}_${username}`;

    // Delete the folder if it already exists
    await fs.remove(outputFolder);

    // Create the folder
    await fs.mkdirp(outputFolder);

    // Create a README.md file with the entity name and username and the repository list
    const readme = `# ${entity} @${username}\n\n## Repositories\n\n${repositories
      .map((repo) => `- [${repo.name}](${repo.html_url})`)
      .join('\n')}`;
    await fs.writeFile(`${outputFolder}/README.md`, readme);

    // Clone repositories with progress
    for (const repo of repositories) {
      const repoUrl = repo.clone_url;
      const repoName = repo.name;
      console.log(`\n${chalk.yellow('ℹ')} Cloning ${chalk.blue(repoName)}...`);

      // Use git-clone to clone the repository
      await new Promise((resolve, reject) => {
        gitClone(repoUrl, `${outputFolder}/${repoName}`, {}, (err) => {
          if (err) {
            console.error(
              chalk.red(`ℹ Error cloning ${repoName}: ${err.message}`),
            );
            reject(err);
          } else {
            console.log(`${chalk.green('✔')} Cloned ${chalk.blue(repoName)}`);
            resolve();
          }
        });
      });
    }

    console.log();
    console.log(chalk.green('✔ All repositories cloned successfully.'));
  } catch (error) {
    console.log();
    console.error(chalk.red('ℹ An error occurred:'), error.message);
    process.exit(1);
  }
}

// Main function
async function main() {
  console.log(chalk.yellow('GitHub Repository Cloner'), '\n');

  const userInput = await getUserInput();
  const {entity, username} = userInput;

  const repositories = await fetchRepositories(entity, username);
  await cloneRepositories(repositories, entity, username);
}

main();
