const questions = [
    {
        question: "What is the capital of France?",
        choices: ["Paris", "London", "Berlin"],
        correct: 0,
    },
    {
        question: "Which planet is known as the Red Planet?",
        choices: ["Venus", "Mars", "Jupiter"],
        correct: 1,
    },
    {
        question: "How many continents are there?",
        choices: ["5", "6", "7"],
        correct: 2,
    },
];

let currentQuestion = 0;
let score = 0;

function displayQuestion() {
    if (currentQuestion < questions.length) {
        const questionElement = document.getElementById("question");
        const choicesElement = document.getElementById("choices");
        const current = questions[currentQuestion];

        questionElement.textContent = current.question;
        choicesElement.innerHTML = "";

        for (let i = 0; i < current.choices.length; i++) {
            const button = document.createElement("button");
            button.textContent = current.choices[i];
            button.className = "btn";
            choicesElement.appendChild(button);
        }
    } else {
        endGame();
    }
}

function checkAnswer(choice) {
    if (choice === questions[currentQuestion].correct) {
        score++;
    }

    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        displayQuestion();
    } else {
        endGame();
    }
}

function endGame() {
    const questionElement = document.getElementById("question");
    const choicesElement = document.getElementById("choices");
    const scoreElement = document.getElementById("score");

    questionElement.textContent = "Quiz Complete!";
    choicesElement.innerHTML = "";
    scoreElement.textContent = `Final Score: ${score} out of ${questions.length}`;
}

displayQuestion();