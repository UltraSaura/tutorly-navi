/** Four-level F.02 reference lesson for isolated QA only; objective IDs are test-fixture placeholders. Never persist or publish. */
export const cm2FractionLessonV21Fixture: unknown = {
  "version": "2.1",
  "topic_goal": "Additionner des fractions de dénominateurs différents en les exprimant avec des parts de même taille.",
  "levels": [
    {
      "id": "cm2-fractions-level-1",
      "level_number": 1,
      "title": "Reconnaître les parts d’une fraction",
      "purpose": "Comprendre qu’une fraction décrit des parts égales d’un même tout.",
      "difficulty": "découverte",
      "objective_ids": [
        "test-fixture:cm2-fractions-level-1"
      ],
      "lesson": {
        "lesson_goal": "Lire une fraction comme un nombre de parts égales prises dans un tout.",
        "success_criteria": [
          "Je vérifie que les parts sont égales.",
          "Je relie le dénominateur au nombre total de parts.",
          "Je relie le numérateur au nombre de parts choisies."
        ],
        "prerequisites": [
          {
            "id": "equal-parts",
            "description": "Comprendre le partage en parts de même taille.",
            "check_question": "Une barre est-elle partagée en parts égales ?",
            "answer_type": "multiple_choice",
            "choices": [
              "Oui, chaque part a la même longueur",
              "Non, les parts n’ont pas la même longueur"
            ],
            "expected_answer": "Oui, chaque part a la même longueur",
            "remediation_hint": "Compare les longueurs des parts avant de compter."
          }
        ],
        "misconceptions": [
          {
            "id": "unequal-parts",
            "description": "L’élève compte des morceaux qui n’ont pas la même taille comme des parts d’une fraction.",
            "detect_if": "Il choisit une fraction à partir du seul nombre de régions dessinées.",
            "feedback": "Pour parler de fraction d’un tout, les parts doivent avoir la même taille.",
            "remediation_strategy": "Revenir à une barre partagée en quatre parts égales et demander de comparer les longueurs."
          }
        ],
        "sequence": [
          {
            "id": "fraction-discover-hook",
            "type": "hook",
            "title": "Une barre partagée en quatre",
            "content": "Imagine une barre de chocolat partagée en quatre parts égales. Trois parts sont prises. Comment noter cette quantité ?"
          },
          {
            "id": "fraction-select-three-quarters",
            "type": "interactive_activity",
            "activity": {
              "schemaVersion": 1,
              "id": "cm2-fraction-select-3-4",
              "kind": "fraction-select",
              "schoolLevel": "CM2",
              "title": "Construire trois quarts",
              "prompt": "Sélectionne trois parts parmi quatre parts égales.",
              "target": {
                "n": 3,
                "d": 4
              },
              "transfer": {
                "n": 2,
                "d": 3
              }
            }
          },
          {
            "id": "fraction-read-mastery-check",
            "type": "mastery_check",
            "questions": [
              {
                "id": "fraction-read-q1",
                "question": "Dans \\(\\frac{3}{4}\\), que signifie le 4 ?",
                "answer_type": "multiple_choice",
                "choices": [
                  "\\(\\frac{2}{4}\\)",
                  "Le nombre de parts égales du tout",
                  "Le nombre de parts coloriées"
                ],
                "correct_answer": "Le nombre de parts égales du tout",
                "skill": "Lire le dénominateur",
                "difficulty": 1,
                "success_feedback": "Oui : le dénominateur indique le nombre de parts égales du tout.",
                "error_feedback": "Le nombre du bas indique en combien de parts égales le tout est partagé."
              }
            ]
          }
        ],
        "mastery": {
          "skills": [
            "Lire une fraction comme parts égales"
          ],
          "threshold": 0.8
        }
      }
    },
    {
      "id": "cm2-fractions-level-2",
      "level_number": 2,
      "title": "Partager chaque moitié en deux quarts",
      "purpose": "Comprendre pourquoi une quantité reste égale quand chaque part est subdivisée.",
      "difficulty": "comprendre",
      "objective_ids": [
        "test-fixture:cm2-fractions-level-2"
      ],
      "lesson": {
        "lesson_goal": "Expliquer que deux quarts couvrent la même quantité qu’une moitié.",
        "success_criteria": [
          "Je garde le même tout.",
          "Je partage chaque moitié en deux parts égales.",
          "J’explique pourquoi le nombre de parts change sans changer la quantité."
        ],
        "prerequisites": [
          {
            "id": "read-one-half",
            "description": "Lire une moitié comme une part sur deux parts égales.",
            "check_question": "Dans une moitié, combien de parts égales forment le tout ?",
            "answer_type": "numeric",
            "expected_answer": "2",
            "remediation_hint": "Le nombre du bas indique en combien de parts égales le tout est partagé."
          }
        ],
        "misconceptions": [
          {
            "id": "fraction-value-changes",
            "description": "L’élève pense que la fraction devient plus grande parce que le numérateur et le dénominateur augmentent.",
            "detect_if": "Il affirme que deux quarts représentent plus qu’une moitié.",
            "feedback": "On a découpé les mêmes deux moitiés en parts plus petites : la longueur totale coloriée n’a pas changé.",
            "remediation_strategy": "Superposer ou aligner la barre d’une moitié avec celle de deux quarts et comparer la longueur coloriée."
          }
        ],
        "sequence": [
          {
            "id": "equivalent-fraction-concept",
            "type": "concept",
            "title": "Même quantité, parts plus petites",
            "content": "On garde la même barre entière. Si chaque moitié est partagée en deux, il y a quatre parts égales. Les deux parts coloriées couvrent toujours la même longueur : \\(\\frac{1}{2}=\\frac{2}{4}\\). Le dénominateur indique le nombre de parts égales du tout; le numérateur indique combien de parts on prend.",
            "key_points": [
              {
                "label": "Le tout ne change pas",
                "text": "La barre de référence garde la même longueur."
              },
              {
                "label": "Les parts deviennent plus petites",
                "text": "Chaque moitié est découpée en deux quarts."
              }
            ],
            "takeaway": "Une fraction équivalente représente la même quantité avec un autre découpage."
          },
          {
            "id": "equivalent-fraction-visual-half",
            "type": "visual",
            "title": "Une moitié coloriée",
            "content": "La barre entière est partagée en deux parts égales; une part est coloriée.",
            "visual": {
              "kind": "fraction_bar",
              "purpose": "Voir la quantité correspondant à une moitié.",
              "alt_text": "Une barre partagée en deux parts égales, avec une part coloriée.",
              "data": {
                "numerator": 1,
                "denominator": 2
              }
            }
          },
          {
            "id": "equivalent-fraction-visual-fourths",
            "type": "visual",
            "title": "Deux quarts coloriés",
            "content": "La même barre entière est maintenant partagée en quatre parts égales; deux parts sont coloriées.",
            "visual": {
              "kind": "fraction_bar",
              "purpose": "Comparer la longueur coloriée avec la barre d’une moitié affichée juste avant.",
              "alt_text": "Une barre de même longueur partagée en quatre parts égales, avec deux parts coloriées.",
              "data": {
                "numerator": 2,
                "denominator": 4
              }
            }
          },
          {
            "id": "select-two-fourths",
            "type": "interactive_activity",
            "activity": {
              "schemaVersion": 1,
              "id": "cm2-fraction-select-2-4",
              "kind": "fraction-select",
              "schoolLevel": "CM2",
              "title": "Sélectionner deux quarts",
              "prompt": "Sélectionne deux parts parmi quatre parts égales.",
              "target": {
                "n": 2,
                "d": 4
              },
              "transfer": {
                "n": 1,
                "d": 2
              }
            }
          },
          {
            "id": "equivalence-mastery-check",
            "type": "mastery_check",
            "questions": [
              {
                "id": "equivalence-q1",
                "question": "Quelle fraction représente la même quantité qu’une moitié parmi quatre parts égales ?",
                "answer_type": "multiple_choice",
                "choices": [
                  "\\(\\frac{2}{4}\\)",
                  "\\(\\frac{1}{4}\\)",
                  "\\(\\frac{4}{2}\\)"
                ],
                "correct_answer": "\\(\\frac{2}{4}\\)",
                "skill": "Reconnaître une fraction équivalente",
                "difficulty": 1,
                "success_feedback": "Oui : deux quarts couvrent la même quantité qu’une moitié.",
                "error_feedback": "Compare la longueur coloriée des deux barres."
              }
            ]
          }
        ],
        "mastery": {
          "skills": [
            "Expliquer une équivalence de fractions par subdivision égale"
          ],
          "threshold": 0.8
        }
      }
    },
    {
      "id": "cm2-fractions-level-3",
      "level_number": 3,
      "title": "Additionner des quarts de même taille",
      "purpose": "Transformer avant d’additionner, puis relier le nombre de parts au résultat.",
      "difficulty": "pratique guidée",
      "objective_ids": [
        "test-fixture:cm2-fractions-level-3"
      ],
      "lesson": {
        "lesson_goal": "Résoudre \\(\\frac{3}{4}+\\frac{1}{2}\\) en remplaçant les moitiés par des quarts équivalents.",
        "success_criteria": [
          "Je n’additionne pas des parts de tailles différentes.",
          "Je réécris \\(\\frac{1}{2}\\) sous forme de quarts.",
          "J’additionne les parts de même taille et j’interprète le résultat."
        ],
        "prerequisites": [
          {
            "id": "equivalent-half-quarter",
            "description": "Reconnaître l’équivalence entre une moitié et deux quarts.",
            "check_question": "Combien de quarts représentent une moitié ?",
            "answer_type": "numeric",
            "expected_answer": "2",
            "remediation_hint": "Partage chacune des deux moitiés en deux parts égales."
          }
        ],
        "misconceptions": [
          {
            "id": "add-denominators",
            "description": "L’élève additionne aussi les dénominateurs.",
            "detect_if": "Il écrit \\(\\frac{3}{4}+\\frac{1}{2}=\\frac{4}{6}\\).",
            "feedback": "Les dénominateurs décrivent la taille des parts. Il faut d’abord parler de parts de même taille.",
            "remediation_strategy": "Revenir aux bandes : transformer la moitié en deux quarts, puis compter trois quarts et deux quarts."
          },
          {
            "id": "ignore-equivalence",
            "description": "L’élève ajoute le numérateur sans transformer la moitié.",
            "detect_if": "Il écrit \\(\\frac{3}{4}+\\frac{1}{2}=\\frac{4}{4}\\).",
            "feedback": "Le quart et la moitié ne sont pas des parts de même taille.",
            "remediation_strategy": "Demander combien de quarts couvrent la moitié avant de calculer."
          }
        ],
        "sequence": [
          {
            "id": "fraction-add-worked",
            "type": "worked_example",
            "context": "On additionne trois quarts de la même barre et une moitié de cette barre.",
            "steps": [
              {
                "instruction": "Découper chaque moitié en deux parts égales.",
                "representation": "La barre d’une moitié devient deux quarts.",
                "reason": "La quantité coloriée reste la même; seules les parts sont plus petites."
              },
              {
                "instruction": "Réécrire la somme avec des quarts.",
                "representation": "\\(\\frac{3}{4}+\\frac{2}{4}\\)",
                "reason": "Les deux fractions comptent maintenant des parts de même taille."
              },
              {
                "instruction": "Additionner les parts coloriées.",
                "representation": "\\(\\frac{3}{4}+\\frac{2}{4}=\\frac{5}{4}\\)",
                "reason": "Trois quarts et deux quarts font cinq quarts."
              },
              {
                "instruction": "Interpréter cinq quarts.",
                "representation": "\\(\\frac{5}{4}=1+\\frac{1}{4}\\)",
                "reason": "Quatre quarts font un tout; il reste un quart."
              }
            ],
            "conclusion": "La somme vaut un tout et un quart."
          },
          {
            "id": "fraction-add-guided",
            "type": "interactive_activity",
            "activity": {
              "schemaVersion": 1,
              "id": "cm2-fraction-add-3-4-plus-1-2",
              "kind": "fraction-bar",
              "schoolLevel": "CM2",
              "title": "Additionner trois quarts et une moitié",
              "prompt": "Transforme les moitiés en quarts puis additionne.",
              "left": {
                "n": 3,
                "d": 4
              },
              "right": {
                "n": 1,
                "d": 2
              },
              "targetDenominator": 4,
              "transfer": {
                "left": {
                  "n": 1,
                  "d": 4
                },
                "right": {
                  "n": 1,
                  "d": 2
                },
                "targetDenominator": 4
              }
            }
          },
          {
            "id": "fraction-add-check",
            "type": "feedback_checkpoint",
            "question": "Pourquoi peut-on additionner les numérateurs après avoir transformé \\(\\frac{1}{2}\\) en \\(\\frac{2}{4}\\) ?",
            "answer_type": "multiple_choice",
            "choices": [
              "Parce que les deux fractions comptent maintenant des quarts de même taille",
              "Parce qu’on additionne aussi les dénominateurs"
            ],
            "correct_answer": "Parce que les deux fractions comptent maintenant des quarts de même taille",
            "success_feedback": "Exact : les parts ont la même taille, donc on peut compter toutes les parts ensemble.",
            "error_feedback": "Regarde la taille d’une part dans chaque barre. Il faut des parts de même taille avant de les réunir.",
            "hints": [
              "Compare la taille d’un quart et d’une moitié.",
              "Réécris la moitié comme deux quarts."
            ]
          },
          {
            "id": "fraction-add-mastery-check",
            "type": "mastery_check",
            "questions": [
              {
                "id": "fraction-add-q1",
                "question": "Combien vaut \\(\\frac{3}{4}+\\frac{1}{2}\\) ?",
                "answer_type": "multiple_choice",
                "choices": [
                  "\\(\\frac{5}{4}\\)",
                  "\\(\\frac{4}{6}\\)",
                  "\\(\\frac{4}{4}\\)"
                ],
                "correct_answer": "\\(\\frac{5}{4}\\)",
                "skill": "Additionner après mise en parts de même taille",
                "difficulty": 1,
                "success_feedback": "Oui : une moitié vaut deux quarts, puis trois quarts et deux quarts font cinq quarts.",
                "error_feedback": "Transforme d’abord la moitié en quarts, puis additionne les parts."
              }
            ]
          }
        ],
        "mastery": {
          "skills": [
            "Additionner des fractions compatibles en utilisant une équivalence"
          ],
          "threshold": 0.8
        }
      }
    },
    {
      "id": "cm2-fractions-level-4",
      "level_number": 4,
      "title": "Résoudre un nouveau calcul et expliquer le résultat",
      "purpose": "Réutiliser la méthode avec d’autres valeurs et vérifier le sens de la somme.",
      "difficulty": "transfert",
      "objective_ids": [
        "test-fixture:cm2-fractions-level-4"
      ],
      "lesson": {
        "lesson_goal": "Résoudre une somme nouvelle de fractions compatibles et expliquer pourquoi les parts peuvent être réunies.",
        "success_criteria": [
          "Je repère les tailles de parts.",
          "Je choisis une écriture équivalente avec des parts de même taille.",
          "Je calcule puis je vérifie si le résultat est inférieur ou supérieur à un tout."
        ],
        "prerequisites": [
          {
            "id": "same-size-parts",
            "description": "Savoir que seules des parts de même taille peuvent être comptées ensemble.",
            "check_question": "Avant d’additionner, que dois-tu vérifier ?",
            "answer_type": "short_text",
            "expected_answer": "Que les parts ont la même taille",
            "remediation_hint": "Compare les dénominateurs et cherche une écriture équivalente."
          }
        ],
        "misconceptions": [
          {
            "id": "copied-result",
            "description": "L’élève recopie le résultat de l’exemple travaillé sans appliquer la méthode aux nouvelles valeurs.",
            "detect_if": "Il donne la réponse précédente ou additionne les mauvais numérateurs.",
            "feedback": "Les nombres ont changé. Représente chaque quantité et vérifie la taille d’une part.",
            "remediation_strategy": "Demander d’abord une fraction équivalente, puis laisser l’élève effectuer la somme avec une nouvelle tentative."
          }
        ],
        "sequence": [
          {
            "id": "fraction-transfer-activity",
            "type": "interactive_activity",
            "activity": {
              "schemaVersion": 1,
              "id": "cm2-fraction-transfer-2-4-plus-1-4",
              "kind": "fraction-bar",
              "schoolLevel": "CM2",
              "title": "Résoudre une nouvelle addition",
              "prompt": "Additionne deux quarts et un quart, puis essaie le calcul de transfert sans aide.",
              "left": {
                "n": 2,
                "d": 4
              },
              "right": {
                "n": 1,
                "d": 4
              },
              "targetDenominator": 4,
              "transfer": {
                "left": {
                  "n": 1,
                  "d": 4
                },
                "right": {
                  "n": 1,
                  "d": 2
                },
                "targetDenominator": 4
              }
            }
          },
          {
            "id": "fraction-transfer-reflection",
            "type": "reflection",
            "question": "Dans le calcul de transfert, qu’est-ce qui a changé et qu’est-ce qui doit rester égal pour additionner ?",
            "expected_idea": "Les nombres peuvent changer, mais il faut réécrire les fractions avec des parts de même taille; la quantité reste la même lors d’une équivalence."
          },
          {
            "id": "fraction-final-summary",
            "type": "concept",
            "title": "La méthode à retenir",
            "content": "Pour additionner des fractions de tailles différentes, on cherche une écriture équivalente avec des parts de même taille. On additionne alors les nombres de parts. Par exemple : \\(\\frac{1}{4}+\\frac{1}{2}=\\frac{1}{4}+\\frac{2}{4}=\\frac{3}{4}\\).",
            "takeaway": "Je transforme les fractions sans changer leur quantité, puis je compte les parts de même taille."
          },
          {
            "id": "fraction-transfer-mastery-check",
            "type": "mastery_check",
            "questions": [
              {
                "id": "fraction-transfer-q1",
                "question": "Pour résoudre \\(\\frac{1}{4}+\\frac{1}{2}\\), quelle écriture garde la même quantité et permet de compter des parts de même taille ?",
                "answer_type": "multiple_choice",
                "choices": [
                  "\\(\\frac{1}{4}+\\frac{2}{4}\\)",
                  "\\(\\frac{2}{4}+\\frac{1}{2}\\)",
                  "\\(\\frac{1}{5}+\\frac{1}{3}\\)"
                ],
                "correct_answer": "\\(\\frac{1}{4}+\\frac{2}{4}\\)",
                "skill": "Justifier la mise en parts de même taille",
                "difficulty": 2,
                "success_feedback": "Exact : une moitié équivaut à deux quarts.",
                "error_feedback": "Vérifie que chaque fraction garde sa valeur et que les deux parts deviennent des quarts."
              }
            ]
          }
        ],
        "mastery": {
          "skills": [
            "Transférer la méthode et justifier l’équivalence"
          ],
          "threshold": 0.8
        }
      }
    }
  ]
};
