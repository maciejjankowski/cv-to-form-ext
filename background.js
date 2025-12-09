// background.js

// Nasłuchuj wiadomości z popup.js
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "savePage") {
    // Pobierz dane strony z request
    const pageTitle = request.pageTitle;
    const pageUrl = request.pageUrl;

    // Pobierz token GitHub z localStorage
    chrome.storage.local.get(
      ["githubToken", "githubUsername", "githubRepo"],
      function (result) {
        const githubToken = result.githubToken;
        const githubUsername = result.githubUsername;
        const githubRepo = result.githubRepo;

        // Sprawdź, czy token, nazwa użytkownika i repozytorium są dostępne
        if (!githubToken || !githubUsername || !githubRepo) {
          console.error(
            "Błąd: Brak tokena, nazwy użytkownika lub repozytorium GitHub."
          );
          return;
        }

        // Pobierz zawartość pliku README.md z repozytorium Wiki
        fetch(
          `https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/Home.md`,
          {
            headers: {
              Authorization: `token ${githubToken}`,
            },
          }
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Błąd pobierania pliku README.md: ${response.status}`
              );
            }
            return response.json();
          })
          .then((data) => {
            // Dekoduj zawartość pliku README.md
            const readmeContent = atob(data.content);

            // Dodaj nowy podpunkt do listy
            const newReadmeContent =
              readmeContent + `\n- [${pageTitle}](${pageUrl})`;

            // Zakoduj nową zawartość pliku README.md w base64
            const base64Content = btoa(newReadmeContent);

            // Zaktualizuj plik README.md w repozytorium Wiki
            fetch(
              `https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/Home.md`,
              {
                method: "PUT",
                headers: {
                  Authorization: `token ${githubToken}`,
                },
                body: JSON.stringify({
                  message: "Dodano nową stronę z Bookhub",
                  content: base64Content,
                  sha: data.sha,
                }),
              }
            )
              .then((response) => {
                if (!response.ok) {
                  throw new Error(
                    `Błąd aktualizacji pliku README.md: ${response.status}`
                  );
                }
                console.log("Strona zapisana pomyślnie!");
              })
              .catch((error) => {
                console.error(`Błąd: ${error.message}`);
              });
          })
          .catch((error) => {
            console.error(`Błąd: ${error.message}`);
          });
      }
    );
  }
});
