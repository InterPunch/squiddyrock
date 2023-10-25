const questions = [
    {
        question: "When was the atomic bomb dropped on Heroshima?",
        choices: ["12/07/2045", "10/31/2023", "8/06/1945"],
        correct: 2,
    },
    {
        question: "Year that the USSR collapsed",
        choices: ["1998", "1991", "1989"],
        correct: 1,
    },
    {
        question: "Year the moon landing happened?",
        choices: ["1969", "2007", "Never"],
        correct: 0,
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
            button.addEventListener("click", function() {
                checkAnswer(i);
            });
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

    currentQuestion++;
    displayQuestion();
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
