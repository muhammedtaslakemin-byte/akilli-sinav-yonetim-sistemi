const prisma = require('../prismaClient');

exports.createQuestion = async (req, res) => {
    try {
        const examId = parseInt(req.params.examId);
        if (isNaN(examId)) {
            return res.status(400).json({ message: 'Geçersiz sınav ID\'si' });
        }

        const exam = await prisma.exam.findUnique({
            where: { id: examId }
        });

        if (!exam) {
            return res.status(404).json({ message: 'Sınav bulunamadı' });
        }

        // Yetki Kontrolü: Yalnızca sınavı oluşturan akademisyen veya yönetici soru ekleyebilir
        if (exam.teacherId !== req.user.id && req.user.role !== 'Yönetici') {
            return res.status(403).json({ message: 'Bu sınava soru ekleme yetkiniz bulunmamaktadır.' });
        }

        // Bitiş Kontrolü: Süresi tamamlanmış sınava soru eklenemez
        if (new Date() > new Date(exam.endTime)) {
            return res.status(400).json({ message: 'Süresi tamamlanmış bir sınava soru eklenemez.' });
        }

        const { text, type, options, questions } = req.body;

        // Toplu soru ekleme desteği (Bulk Insert)
        if (Array.isArray(questions) && questions.length > 0) {
            const created = await prisma.$transaction(
                questions.map(q => prisma.question.create({
                    data: {
                        text: q.text,
                        type: q.type || 'MULTIPLE_CHOICE',
                        examId,
                        options: q.options ? {
                            create: q.options.map(opt => ({
                                text: opt.text,
                                isCorrect: Boolean(opt.isCorrect)
                            }))
                        } : undefined
                    },
                    include: { options: true }
                }))
            );
            return res.status(201).json({ message: `${created.length} soru başarıyla oluşturuldu`, questions: created });
        }

        if (!text || !type) {
            return res.status(400).json({ message: 'Soru metni ve tipi zorunludur.' });
        }

        const question = await prisma.question.create({
            data: {
                text,
                type,
                examId,
                options: options ? {
                    create: options.map(opt => ({
                        text: opt.text,
                        isCorrect: Boolean(opt.isCorrect)
                    }))
                } : undefined
            },
            include: {
                options: true
            }
        });

        res.status(201).json({ message: 'Soru başarıyla oluşturuldu', question });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Soru oluşturulurken hata meydana geldi' });
    }
};

exports.getQuestionsByExam = async (req, res) => {
    try {
        const examId = parseInt(req.params.examId);
        if (isNaN(examId)) {
            return res.status(400).json({ message: 'Geçersiz sınav ID\'si' });
        }

        const exam = await prisma.exam.findUnique({
            where: { id: examId }
        });

        if (!exam) {
            return res.status(404).json({ message: 'Sınav bulunamadı' });
        }

        // Güvenlik: Öğrenci rolü için şube ve zaman kontrolleri
        if (req.user && req.user.role === 'Öğrenci') {
            const student = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { branches: { select: { id: true } } }
            });
            const enrolledBranchIds = student?.branches.map(b => b.id) || [];

            if (!enrolledBranchIds.includes(exam.branchId)) {
                return res.status(403).json({ message: 'Bu sınavın şubesine kayıtlı değilsiniz.' });
            }

            const now = new Date();
            const startTimeWithTolerance = new Date(exam.startTime.getTime() - 5 * 60 * 1000);
            if (now < startTimeWithTolerance) {
                return res.status(403).json({ message: 'Sınav henüz başlamadı. Sınav sorularına erişemezsiniz.' });
            }
            if (now > exam.endTime) {
                return res.status(403).json({ message: 'Sınav süresi tamamlandı. Sorulara erişemezsiniz.' });
            }
        }

        const questions = await prisma.question.findMany({
            where: { examId },
            include: {
                options: true
            },
            orderBy: { id: 'asc' }
        });

        // Güvenlik gereği öğrenciye isCorrect dönülmez, sadece Akademisyen/Yöneticiler görebilir
        const showCorrect = req.user && req.user.role !== 'Öğrenci';
        if (!showCorrect) {
            questions.forEach(q => {
                if (q.options) {
                    q.options.forEach(opt => {
                        delete opt.isCorrect;
                    });
                }
            });
        }

        res.json(questions);
    } catch (error) {
        console.error('getQuestionsByExam error:', error);
        res.status(500).json({ message: 'Sorular getirilirken hata oluştu' });
    }
};
