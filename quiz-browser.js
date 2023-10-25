document.addEventListener("DOMContentLoaded", function () {
    const quizList = document.querySelector(".quiz-list");

    // Load quiz data from the JSON file
    fetch("quizzes.json")
        .then((response) => response.json())
        .then((data) => {
            data.forEach((quiz) => {
                const listItem = document.createElement("li");
                const link = document.createElement("a");
                link.href = quiz.link;
                link.textContent = quiz.title;
                listItem.appendChild(link);
                quizList.appendChild(listItem);
            });
        });
});
