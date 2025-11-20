document.addEventListener('DOMContentLoaded', () => {

    // CONFIGURAÇÃO DO SUPABASE
    const supabaseUrl = 'https://cpxcqupfldioxjeigdto.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNweGNxdXBmbGRpb3hqZWlnZHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTg5NzMsImV4cCI6MjA3OTIzNDk3M30.kSgqM2H7omed_uTD3aL_xkAwfKv0FSXhRIwlTKs_WyQ';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    // VARIÁVEIS GLOBAIS
    const formContainer = document.getElementById('form-container');
    const resultContainer = document.getElementById('result-container');
    const btnBack = document.getElementById('btn-back');
    const progressBar = document.getElementById('progress-bar');
    const spotlightEl = document.getElementById('spotlight');
    const particlesContainer = document.getElementById('particles-container');

    let answers = {};
    let stepHistory = [1];
    let totalSteps = 4;

    // NAVEGAÇÃO
    function showStep(stepId, direction = 'forward') {
        const stepToGo = String(stepId);
        let currentScreen = document.querySelector('.step-screen:not(.hidden)');
        let nextScreen = document.querySelector(`[data-step="${stepToGo}"]`);
        
        if (!nextScreen) return;

        if(direction === 'forward') {
            if (stepHistory[stepHistory.length - 1] !== stepId) {
                stepHistory.push(stepId);
            }
        }

        if (stepHistory.length > 1) {
            btnBack.classList.remove('hidden', 'opacity-0');
            btnBack.classList.add('animate-fade-in');
        } else {
            btnBack.classList.add('hidden', 'opacity-0');
            btnBack.classList.remove('animate-fade-in');
        }

        let currentStepIndex = parseInt(stepToGo); 
        progressBar.style.width = `${(currentStepIndex / totalSteps) * 100}%`;

        if (currentScreen) {
            const exitClass = (direction === 'forward') ? 'step-exit' : 'step-exit-reverse';
            currentScreen.classList.add(exitClass);
            
            setTimeout(() => {
                currentScreen.classList.add('hidden');
                currentScreen.classList.remove(exitClass);

                const enterClass = (direction === 'forward') ? 'step-enter' : 'step-enter-reverse';
                nextScreen.classList.remove('hidden');
                nextScreen.classList.add(enterClass);
                setTimeout(() => nextScreen.classList.remove(enterClass), 500);
            }, 400);
        } else {
             nextScreen.classList.remove('hidden');
             nextScreen.classList.add('step-enter');
             setTimeout(() => nextScreen.classList.remove('step-enter'), 500);
        }
    }

    // BOTÃO VOLTAR
    btnBack.addEventListener('click', () => {
        if (stepHistory.length <= 1) return;
        stepHistory.pop();
        const previousStepId = stepHistory[stepHistory.length - 1];
        const questionId = getQuestionIdFromStep(previousStepId);
        delete answers[questionId];
        const prevScreen = document.querySelector(`[data-step="${previousStepId}"]`);
        if (prevScreen) {
             prevScreen.querySelectorAll('.radio-option.selected').forEach(btn => btn.classList.remove('selected'));
        }
        showStep(previousStepId, 'backward');
    });

    // OPÇÕES (MÚLTIPLA ESCOLHA)
    document.querySelectorAll('.radio-option').forEach(button => {
        button.addEventListener('click', () => {
            const step = button.closest('.step-screen').dataset.step;
            const questionId = getQuestionIdFromStep(step);
            const value = button.dataset.value;
            answers[questionId] = value;
            button.closest('.step-screen').querySelectorAll('.radio-option').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            setTimeout(() => {
                if (button.dataset.submit) {
                    answers['disposicao_mudanca'] = value; 
                    handleSubmit();
                    return;
                }
                if (button.dataset.nextSpecial) showStep(button.dataset.nextSpecial, 'forward');
                else if (button.dataset.next) showStep(button.dataset.next, 'forward');
            }, 300);
        });
    });

    // CAMPO DE TEXTO
    const textInput = document.getElementById('input-desafio');
    const btnNextText = document.getElementById('btn-next-desafio');
    
    if(textInput && btnNextText) {
        textInput.addEventListener('input', () => { btnNextText.disabled = textInput.value.trim() === ""; });
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!btnNextText.disabled) btnNextText.click();
            }
        });
        btnNextText.addEventListener('click', () => {
            answers['desafio'] = textInput.value;
            showStep(4, 'forward');
        });
    }
    
    // SUBMISSÃO E LÓGICA ATUALIZADA
    async function handleSubmit() {
        // Animação do Holofote
        spotlightEl.style.opacity = '1'; 
        await new Promise(r => setTimeout(r, 100));
        spotlightEl.style.clipPath = 'circle(0% at 50% 50%)';

        setTimeout(() => {
            formContainer.classList.add('hidden');
            progressBar.style.width = '100%';
        }, 200);

        // Salva no Supabase
        try {
            const { error } = await supabaseClient.from('pesquisa_landing_page_v2').insert([answers]);
            if (error) throw error;
        } catch (error) { console.error("Erro Supabase:", error); }

        await new Promise(r => setTimeout(r, 1500));

        // Partículas
        particlesContainer.innerHTML = '';
        for (let i = 0; i < 80; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * window.innerWidth * 0.6 + 100;
            particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
            particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
            particle.style.left = '50%';
            particle.style.top = '50%';
            particlesContainer.appendChild(particle);
            setTimeout(() => particle.classList.add('animating'), Math.random() * 100);
        }

        await new Promise(r => setTimeout(r, 600));

        // Lógica de Resultado Atualizada
        const { idade, trabalho, disposicao_mudanca } = answers;
        let resultId;

        // SE: Está disposto a mudar muito -> Grupo Melhor (result-vip_networking)
        if (disposicao_mudanca === 'disposto-muitas-coisas') {
            resultId = 'result-vip_networking';
        } 
        // SE: Não pode mudar muito -> Verifica perfil
        else { 
             // Se o perfil for "bom" (jovem/trabalhador), também vai para o Grupo Melhor
             if (['15-17', '17-20', 'mais-20'].includes(idade) && ['jovem-aprendiz', 'clt', 'autonomo'].includes(trabalho)) {
                resultId = 'result-vip_networking';
             } else {
                 // Caso contrário -> Grupo Normal
                resultId = 'result-geral';
             }
        }

        const resultCard = document.getElementById(resultId);
        resultContainer.classList.remove('hidden');
        resultCard.classList.remove('hidden');
        resultContainer.classList.add('glitch-enter');
        progressBar.style.width = '0%';
        
        setTimeout(() => {
            particlesContainer.innerHTML = '';
            spotlightEl.style.opacity = '0'; 
            spotlightEl.style.clipPath = 'circle(150% at 50% 50%)'; 
        }, 2000);
    }

    function getQuestionIdFromStep(step) {
        step = String(step);
        if (step === '1') return 'idade';
        if (step === '2') return 'trabalho';
        if (step === '3') return 'desafio';
        if (step === '4') return 'disposicao_mudanca';
        return null;
    }

    showStep(1, 'forward');
});
