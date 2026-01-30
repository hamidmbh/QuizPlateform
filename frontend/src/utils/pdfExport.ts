import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quiz, QuizAttempt, User, Class } from '@/types/quiz';

interface ExportData {
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  students: User[];
  classes: Class[];
  selectedQuiz?: string;
  selectedClass?: string;
}

export function exportResultsToPDF({
  quizzes,
  attempts,
  students,
  classes,
  selectedQuiz = 'all',
  selectedClass = 'all'
}: ExportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport des Résultats', pageWidth / 2, 20, { align: 'center' });
  
  // Subtitle with filters
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const filterText = `${selectedQuiz === 'all' ? 'Tous les quiz' : quizzes.find(q => q.id === selectedQuiz)?.title || ''} | ${selectedClass === 'all' ? 'Toutes les classes' : classes.find(c => c.id === selectedClass)?.name || ''}`;
  doc.text(filterText, pageWidth / 2, 28, { align: 'center' });
  
  // Date
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, 35, { align: 'center' });

  // Filter data based on selections
  const filteredStudents = students.filter(s => 
    selectedClass === 'all' || s.classId === selectedClass
  );

  // Build table data
  const tableData: string[][] = [];
  
  filteredStudents.forEach(student => {
    const studentClass = classes.find(c => c.id === student.classId);
    const studentAttempts = attempts.filter(a => {
      const matchesStudent = a.studentId === student.id;
      const matchesQuiz = selectedQuiz === 'all' || a.quizId === selectedQuiz;
      return matchesStudent && matchesQuiz;
    });

    if (studentAttempts.length === 0) {
      tableData.push([
        student.name,
        studentClass?.name || '-',
        '-',
        '-',
        'Non passé'
      ]);
    } else {
      studentAttempts.forEach(attempt => {
        const quiz = quizzes.find(q => q.id === attempt.quizId);
        if (quiz) {
          const score = attempt.score || 0;
          tableData.push([
            student.name,
            studentClass?.name || '-',
            quiz.title,
            `${score}%`,
            new Date(attempt.completedAt).toLocaleDateString('fr-FR')
          ]);
        }
      });
    }
  });

  // Add summary table
  autoTable(doc, {
    startY: 45,
    head: [['Étudiant', 'Classe', 'Quiz', 'Score', 'Date']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250]
    },
    styles: {
      fontSize: 9,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 50 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 35, halign: 'center' }
    }
  });

  // Calculate statistics
  const allScores = attempts
    .filter(a => {
      const matchesQuiz = selectedQuiz === 'all' || a.quizId === selectedQuiz;
      const student = students.find(s => s.id === a.studentId);
      const matchesClass = selectedClass === 'all' || student?.classId === selectedClass;
      return matchesQuiz && matchesClass && a.score !== undefined;
    })
    .map(a => a.score || 0);

  if (allScores.length > 0) {
    const avgScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
    const maxScore = Math.max(...allScores);
    const minScore = Math.min(...allScores);
    const passRate = Math.round((allScores.filter(s => s >= 50).length / allScores.length) * 100);

    // Add statistics section
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistiques', 14, finalY + 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Moyenne générale: ${avgScore}%`, 14, finalY + 25);
    doc.text(`Score le plus élevé: ${maxScore}%`, 14, finalY + 32);
    doc.text(`Score le plus bas: ${minScore}%`, 14, finalY + 39);
    doc.text(`Taux de réussite (≥50%): ${passRate}%`, 14, finalY + 46);
    doc.text(`Nombre de tentatives: ${allScores.length}`, 14, finalY + 53);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `QuizMaster - Page ${i} / ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `resultats-quiz-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export function exportDetailedResultsToPDF({
  quiz,
  attempts,
  students,
  classes
}: {
  quiz: Quiz;
  attempts: QuizAttempt[];
  students: User[];
  classes: Class[];
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`Résultats: ${quiz.title}`, pageWidth / 2, 20, { align: 'center' });

  // Quiz info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${quiz.questions.length} questions | ${quiz.timeLimit} minutes`, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 35, { align: 'center' });

  // Build detailed results
  const quizAttempts = attempts.filter(a => a.quizId === quiz.id);
  
  const tableData: string[][] = quizAttempts.map(attempt => {
    const student = students.find(s => s.id === attempt.studentId);
    const studentClass = classes.find(c => c.id === student?.classId);
    
    // Count correct answers
    let correctCount = 0;
    quiz.questions.forEach((q, i) => {
      if (attempt.answers[i] === q.correctAnswer) {
        correctCount++;
      }
    });

    return [
      student?.name || 'Inconnu',
      studentClass?.name || '-',
      `${correctCount}/${quiz.questions.length}`,
      `${attempt.score || 0}%`,
      new Date(attempt.completedAt).toLocaleDateString('fr-FR')
    ];
  });

  autoTable(doc, {
    startY: 45,
    head: [['Étudiant', 'Classe', 'Bonnes réponses', 'Score', 'Date']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold'
    }
  });

  // Questions breakdown
  let yPos = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Analyse par question', 14, yPos);
  yPos += 10;

  quiz.questions.forEach((question, qIndex) => {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = 20;
    }

    // Calculate success rate for this question
    const correctForQuestion = quizAttempts.filter(a => a.answers[qIndex] === question.correctAnswer).length;
    const successRate = quizAttempts.length > 0 
      ? Math.round((correctForQuestion / quizAttempts.length) * 100) 
      : 0;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Q${qIndex + 1}: ${question.text.substring(0, 80)}${question.text.length > 80 ? '...' : ''}`, 14, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.text(`Taux de réussite: ${successRate}% (${correctForQuestion}/${quizAttempts.length})`, 20, yPos);
    yPos += 6;
    doc.text(`Bonne réponse: ${question.options[question.correctAnswer]}`, 20, yPos);
    yPos += 10;
  });

  // Save
  const fileName = `resultats-${quiz.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
