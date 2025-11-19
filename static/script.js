class MultiAgentChat {
    constructor() {
        this.currentSessionId = null;
        this.selectedAgent = null;
        this.agents = {};
        this.sessions = [];
        this.mentionDropdownVisible = false;
        this.selectedMentionIndex = -1;
        this.lastUserMessage = null;
        this.currentDiscussionData = null; // 存储当前讨论的详细数据
        this.uploadedFiles = []; // 存储已上传的文件
        this.discussionFiles = []; // 存储讨论中上传的文件
        this.isDragging = false; // 拖拽状态
        
        // 简化的任务跟踪
        this.activeTasks = new Set();
        
        this.init();
    }

    async init() {
        await this.loadAgents();
        await this.loadSessions();
        this.setupEventListeners();
        this.setupImageModal();
        this.renderAgents();
        this.renderSessions();
        this.renderAgentSelection();
        this.initMemoryManagement(); // 初始化记忆管理
        this.setupMobilePlaceholder(); // 设置移动端placeholder
    }
    
    setupMobilePlaceholder() {
        const messageInput = document.getElementById('message-input');
        if (!messageInput) return;
        
        const updatePlaceholder = () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                messageInput.placeholder = '输入问题...（可使用 @ 提及角色）';
            } else {
                messageInput.placeholder = '输入您的问题...（可以使用@产品经理 来指定特定角色回答）';
            }
        };
        
        // 初始设置
        updatePlaceholder();
        
        // 监听窗口大小变化
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(updatePlaceholder, 200);
        });
    }

    async loadAgents() {
        try {
            const response = await fetch('/api/agents');
            const data = await response.json();
            this.agents = data.agents;
        } catch (error) {
            console.error('加载Agent失败:', error);
        }
    }

    async loadSessions() {
        try {
            const response = await fetch('/api/sessions');
            const data = await response.json();
            this.sessions = data.sessions;
        } catch (error) {
            console.error('❌ 加载会话失败:', error);
            this.sessions = [];
        }
    }

    setupEventListeners() {
        // 发送按钮
        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        // 输入框回车发送
        const input = document.getElementById('message-input');
        input.addEventListener('keydown', (e) => {
            if (this.mentionDropdownVisible) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateMentionDropdown(1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateMentionDropdown(-1);
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    this.selectMentionOption();
                } else if (e.key === 'Escape') {
                    this.hideMentionDropdown();
                }
                return;
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 自动调整输入框高度和处理@提及
        input.addEventListener('input', (e) => {
            this.autoResizeTextarea();
            this.handleMentionInput(e);
        });

        // 点击外部关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.input-section')) {
                this.hideMentionDropdown();
            }
        });

        // 新建对话按钮
        document.getElementById('new-chat-btn').addEventListener('click', () => {
            this.createNewChat();
        });
        
        // 移动端菜单按钮和侧边栏控制
        const mobileMenuLeft = document.getElementById('mobile-menu-left');
        const mobileMenuRight = document.getElementById('mobile-menu-right');
        const sidebarLeft = document.querySelector('.sidebar-left');
        const sidebarRight = document.querySelector('.sidebar-right');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        
        // 关闭所有侧边栏的函数
        const closeAllSidebars = () => {
            console.log('📱 关闭所有侧边栏');
            sidebarLeft?.classList.remove('show');
            sidebarRight?.classList.remove('show');
            sidebarOverlay?.classList.remove('show');
            document.body.style.overflow = ''; // 恢复body滚动
        };
        
        // 打开左侧边栏
        if (mobileMenuLeft && sidebarLeft && sidebarOverlay) {
            mobileMenuLeft.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('📱 打开左侧边栏');
                closeAllSidebars(); // 先关闭其他侧边栏
                sidebarLeft.classList.add('show');
                sidebarOverlay.classList.add('show');
                document.body.style.overflow = 'hidden'; // 防止背景滚动
            });
        }
        
        // 打开右侧边栏
        if (mobileMenuRight && sidebarRight && sidebarOverlay) {
            mobileMenuRight.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('📱 打开右侧边栏');
                closeAllSidebars(); // 先关闭其他侧边栏
                sidebarRight.classList.add('show');
                sidebarOverlay.classList.add('show');
                document.body.style.overflow = 'hidden'; // 防止背景滚动
            });
        }
        
        // 点击遮罩层关闭侧边栏
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', (e) => {
                console.log('📱 点击遮罩层，关闭侧边栏');
                e.stopPropagation();
                closeAllSidebars();
            });
        }
        
        // 阻止侧边栏内部点击事件冒泡
        if (sidebarLeft) {
            sidebarLeft.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        if (sidebarRight) {
            sidebarRight.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // 添加滑动手势关闭侧边栏
        let touchStartX = 0;
        let touchStartY = 0;
        
        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        };
        
        const handleTouchEnd = (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // 确保是水平滑动（而非垂直滚动）
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                // 左侧边栏向左滑动关闭
                if (sidebarLeft.classList.contains('show') && deltaX < -50) {
                    console.log('📱 向左滑动关闭左侧边栏');
                    closeAllSidebars();
                }
                // 右侧边栏向右滑动关闭
                if (sidebarRight.classList.contains('show') && deltaX > 50) {
                    console.log('📱 向右滑动关闭右侧边栏');
                    closeAllSidebars();
                }
            }
        };
        
        if (sidebarLeft) {
            sidebarLeft.addEventListener('touchstart', handleTouchStart);
            sidebarLeft.addEventListener('touchend', handleTouchEnd);
        }
        
        if (sidebarRight) {
            sidebarRight.addEventListener('touchstart', handleTouchStart);
            sidebarRight.addEventListener('touchend', handleTouchEnd);
        }
        
        // ESC键关闭侧边栏
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (sidebarLeft?.classList.contains('show') || sidebarRight?.classList.contains('show')) {
                    console.log('📱 按ESC键关闭侧边栏');
                    closeAllSidebars();
                }
            }
        });
        
        // 侧边栏关闭按钮
        const sidebarLeftClose = document.getElementById('sidebar-left-close');
        const sidebarRightClose = document.getElementById('sidebar-right-close');
        
        if (sidebarLeftClose) {
            sidebarLeftClose.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('📱 点击左侧边栏关闭按钮');
                closeAllSidebars();
            });
        }
        
        if (sidebarRightClose) {
            sidebarRightClose.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('📱 点击右侧边栏关闭按钮');
                closeAllSidebars();
            });
        }

        // 讨论按钮
        const discussionBtn = document.getElementById('discussion-btn');
        if (discussionBtn) {
            discussionBtn.addEventListener('click', (e) => {
                console.log('🎯 讨论按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.showDiscussionPanel();
            });
        } else {
            console.error('❌ 讨论按钮未找到');
        }

        // 讨论面板关闭
        document.getElementById('close-discussion-panel').addEventListener('click', () => {
            this.hideDiscussionPanel();
        });

        // 点击遮罩层关闭讨论面板
        const discussionPanel = document.getElementById('discussion-panel');
        if (discussionPanel) {
            discussionPanel.addEventListener('click', (e) => {
                if (e.target === discussionPanel) {
                    this.hideDiscussionPanel();
                }
            });
        }

        // 开始讨论按钮
        document.getElementById('start-discussion-btn').addEventListener('click', () => {
            this.startDiscussion();
        });

        // 讨论详情弹窗关闭按钮
        document.getElementById('close-discussion-details').addEventListener('click', () => {
            this.hideDiscussionDetails();
        });

        // 点击讨论详情弹窗外部关闭
        const discussionDetailsModal = document.getElementById('discussion-details-modal');
        if (discussionDetailsModal) {
            discussionDetailsModal.addEventListener('click', (e) => {
                if (e.target === discussionDetailsModal) {
                    this.hideDiscussionDetails();
                }
            });
        }

        // 讨论文件上传按钮
        document.getElementById('discussion-file-upload-btn').addEventListener('click', () => {
            document.getElementById('discussion-file-input').click();
        });

        // 讨论文件选择
        document.getElementById('discussion-file-input').addEventListener('change', (e) => {
            this.handleDiscussionFileUpload(e.target.files);
        });

        // 文件上传按钮
        document.getElementById('file-upload-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        // 文件选择
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // 拖拽上传事件
        const chatMessages = document.querySelector('.chat-messages');
        const dragOverlay = document.getElementById('drag-overlay');

        // 阻止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // 拖拽进入
        document.addEventListener('dragenter', (e) => {
            if (this.isDragValid(e)) {
                this.isDragging = true;
                dragOverlay.classList.add('show');
            }
        });

        // 拖拽离开
        document.addEventListener('dragleave', (e) => {
            if (!e.relatedTarget || e.relatedTarget === document.body || !document.body.contains(e.relatedTarget)) {
                this.isDragging = false;
                dragOverlay.classList.remove('show');
            }
        });

        // 文件拖拽放下
        dragOverlay.addEventListener('drop', (e) => {
            this.isDragging = false;
            dragOverlay.classList.remove('show');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files);
            }
        });

        // Agent选择相关事件
        document.getElementById('select-all-agents').addEventListener('click', () => {
            this.selectAllAgents(true);
        });

        document.getElementById('select-none-agents').addEventListener('click', () => {
            this.selectAllAgents(false);
        });
    }

    autoResizeTextarea() {
        const textarea = document.getElementById('message-input');
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    renderAgents() {
        const agentsList = document.getElementById('agents-list');
        agentsList.innerHTML = '';

        Object.values(this.agents).forEach(agent => {
            const agentElement = document.createElement('div');
            agentElement.className = 'agent-item';
            agentElement.style.setProperty('--agent-color', agent.color);
            
            agentElement.innerHTML = `
                <div class="agent-header">
                    <div class="agent-avatar" style="background: ${agent.color}">
                        ${agent.name.charAt(0)}
                    </div>
                    <div class="agent-name">${agent.name}</div>
                </div>
                <div class="agent-description">
                    ${this.getAgentDescription(agent.name)}
                </div>
                <div class="agent-model">模型: ${agent.model}</div>
            `;

            agentElement.addEventListener('click', () => {
                this.selectAgent(agent.name, agentElement);
            });

            agentsList.appendChild(agentElement);
        });
    }

    getAgentDescription(agentName) {
        const descriptions = {
            '产品经理': '专注产品策略、需求分析和用户体验设计',
            '技术总监': '负责技术架构、开发规划和技术可行性分析',
            '市场专家': '提供市场分析、竞品研究和营销策略建议',
            'UX设计师': '专业于用户体验设计和交互优化',
            '商业分析师': '进行商业模式分析和投资回报评估',
            'Web搜索专家': '专业的信息搜索专家，获取最新准确信息',
            'GPT5': 'OpenAI最新旗舰模型，具备统一路由系统架构',
            'GPT4o': 'GPT-4o AI助手，提供通用智能支持',
            'Gemini-3.0-Pro': 'Google最新旗舰AI模型，强大的多模态理解与推理能力',
            'Nano-Banana': '专业图像生成模型，擅长创意与细节',
            'Sora-2-Pro': 'OpenAI视频生成模型，创造流畅自然的高质量视频',
            'Hailuo-Speech-02': '海螺AI语音生成模型，自然流畅的语音合成'
        };
        return descriptions[agentName] || '专业顾问';
    }

    // 渲染Agent选择项
    renderAgentSelection() {
        const agentsSelection = document.getElementById('agents-selection');
        agentsSelection.innerHTML = '';

        // 排除通用助手和生成模型，只显示专业Agent用于讨论
        const discussionAgents = Object.values(this.agents).filter(agent => 
            !['GPT5', 'GPT4o', 'Gemini-3.0-Pro', 'Web搜索专家', 'Nano-Banana', 'Sora-2-Pro', 'Hailuo-Speech-02'].includes(agent.name)
        );

        discussionAgents.forEach(agent => {
            const agentOption = document.createElement('div');
            agentOption.className = 'agent-option';
            
            agentOption.innerHTML = `
                <input type="checkbox" id="agent-${agent.name}" value="${agent.name}" checked>
                <div class="agent-option-avatar" style="background: ${agent.color}">
                    ${agent.name.charAt(0)}
                </div>
                <div class="agent-option-info">
                    <div class="agent-option-name">${agent.name}</div>
                    <div class="agent-option-description">${this.getAgentDescription(agent.name)}</div>
                </div>
            `;

            // 添加点击事件
            agentOption.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = agentOption.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                }
                this.updateAgentOptionStyle(agentOption);
            });

            // 添加checkbox change事件
            const checkbox = agentOption.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                this.updateAgentOptionStyle(agentOption);
            });

            agentsSelection.appendChild(agentOption);
            
            // 初始化样式
            this.updateAgentOptionStyle(agentOption);
        });
    }

    // 更新Agent选项样式
    updateAgentOptionStyle(agentOption) {
        const checkbox = agentOption.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            agentOption.classList.add('selected');
        } else {
            agentOption.classList.remove('selected');
        }
    }

    // 全选/全不选Agent
    selectAllAgents(selectAll) {
        const checkboxes = document.querySelectorAll('#agents-selection input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const agentOption = checkbox.closest('.agent-option');
            this.updateAgentOptionStyle(agentOption);
        });
    }

    // 获取选中的Agent列表
    getSelectedAgents() {
        const checkboxes = document.querySelectorAll('#agents-selection input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(checkbox => checkbox.value);
    }

    selectAgent(agentName, element) {
        // 移除之前的选中状态
        document.querySelectorAll('.agent-item').forEach(item => {
            item.classList.remove('selected');
        });

        // 添加新的选中状态
        element.classList.add('selected');
        this.selectedAgent = agentName;

        // 在输入框中添加@提及
        const input = document.getElementById('message-input');
        const currentText = input.value;
        if (!currentText.includes(`@${agentName}`)) {
            input.value = `@${agentName} ` + currentText;
            input.focus();
        }
    }

    renderSessions() {
        console.log('🎨 开始渲染会话列表，当前会话数:', this.sessions.length);
        console.log('🎯 当前活跃会话ID:', this.currentSessionId);
        
        const sessionsList = document.getElementById('sessions-list');
        sessionsList.innerHTML = '';

        if (this.sessions.length === 0) {
            console.log('📝 没有会话，显示空状态');
            sessionsList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
                    暂无聊天记录
                </div>
            `;
            return;
        }

        // 按更新时间降序排序（最新的在前面）
        const sortedSessions = [...this.sessions].sort((a, b) => {
            const dateA = new Date(a.updated_at);
            const dateB = new Date(b.updated_at);
            return dateB - dateA;
        });

        console.log('📋 会话排序完成，最新会话:', sortedSessions[0]?.title.substring(0, 30) + '...');

        sortedSessions.forEach((session, index) => {
            const sessionElement = document.createElement('div');
            sessionElement.className = 'session-item';
            const isActive = session.id === this.currentSessionId;
            
            if (isActive) {
                sessionElement.classList.add('active');
                console.log(`🎯 设置活跃会话: ${session.title.substring(0, 30)}...`);
            }

            const updateTime = new Date(session.updated_at).toLocaleString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            sessionElement.innerHTML = `
                <div class="session-content">
                    <div class="session-title">${session.title}</div>
                    <div class="session-time">${updateTime}</div>
                </div>
                <div class="session-menu">
                    <button class="session-menu-btn" title="更多操作">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="session-menu-dropdown">
                        <button class="session-menu-item delete" data-session-id="${session.id}">
                            <i class="fas fa-trash"></i>
                            <span>删除会话</span>
                        </button>
                    </div>
                </div>
            `;

            // 点击会话内容区域加载会话
            const sessionContent = sessionElement.querySelector('.session-content');
            sessionContent.addEventListener('click', () => {
                this.loadSession(session.id);
            });

            // 处理菜单按钮点击事件
            const menuBtn = sessionElement.querySelector('.session-menu-btn');
            const menuDropdown = sessionElement.querySelector('.session-menu-dropdown');
            
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 关闭其他所有下拉菜单
                document.querySelectorAll('.session-menu-dropdown').forEach(dropdown => {
                    if (dropdown !== menuDropdown) {
                        dropdown.classList.remove('show');
                    }
                });
                
                // 切换当前下拉菜单
                menuDropdown.classList.toggle('show');
            });

            // 处理删除按钮点击事件
            const deleteBtn = sessionElement.querySelector('.session-menu-item.delete');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.deleteSession(session.id);
                menuDropdown.classList.remove('show');
            });

            sessionsList.appendChild(sessionElement);
            
            if (index === 0) {
                console.log(`📌 添加第一个会话到列表: ${session.title.substring(0, 30)}... (${isActive ? '活跃' : '非活跃'})`);
            }
        });

        // 点击页面其他地方关闭所有下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.session-menu')) {
                document.querySelectorAll('.session-menu-dropdown').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
            }
        });
        
        console.log(`✅ 会话列表渲染完成，DOM中有${sessionsList.children.length}个会话项`);
    }

    async deleteSession(sessionId) {
        if (!confirm('确定要删除这个会话吗？删除后无法恢复。')) {
            return;
        }

        try {
            const response = await fetch(`/api/sessions/${sessionId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log(`✅ 会话已删除: ${sessionId}`);
                
                // 如果删除的是当前会话，创建新对话
                if (this.currentSessionId === sessionId) {
                    this.createNewChat();
                }
                
                // 刷新会话列表
                await this.loadSessions();
                this.renderSessions();
                
                showNotification('会话已删除', 'success');
            } else {
                throw new Error('删除会话失败');
            }
        } catch (error) {
            console.error('删除会话失败:', error);
            showNotification('删除会话失败', 'error');
        }
    }

    async loadSession(sessionId) {
        try {
            // 🔧 检查是否为临时会话ID，如果是则尝试找到对应的真实ID
            let realSessionId = sessionId;
            if (sessionId.startsWith('temp_')) {
                console.log(`⚠️ 尝试加载临时会话ID: ${sessionId}`);
                
                // 查找是否有对应的真实会话
                const matchingSession = this.sessions.find(s => 
                    s.id !== sessionId && 
                    s.title && 
                    (s.title.includes('讨论:') || s.updated_at)
                );
                
                if (matchingSession) {
                    realSessionId = matchingSession.id;
                    console.log(`🔄 找到对应的真实会话: ${sessionId} → ${realSessionId}`);
                } else {
                    console.warn(`❌ 无法找到临时会话${sessionId}对应的真实会话`);
                    // 刷新会话列表，可能数据不同步
                    await this.loadSessions();
                    this.renderSessions();
                    return;
                }
            }
            
            this.currentSessionId = realSessionId;
            this.renderSessions(); // 更新选中状态

            const response = await fetch(`/api/sessions/${realSessionId}`);
            const data = await response.json();
            
            // 检查是否为讨论会话（使用新的标记字段）
            const isDiscussionSession = data.session.title.includes('讨论:') || 
                                       data.session.messages.some(msg => msg.is_discussion === true);
            
            console.log(`加载会话: ${data.session.title}, 是否讨论会话: ${isDiscussionSession}`);
            
            if (isDiscussionSession) {
                this.renderDiscussionSession(data.session.messages);
            } else {
            this.renderMessages(data.session.messages);
            }
            
            // 隐藏欢迎消息
            const welcomeMessage = document.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'none';
            }
        } catch (error) {
            console.error('加载会话失败:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        // 对消息进行分组处理，识别讨论相关的消息
        let i = 0;
        while (i < messages.length) {
            const message = messages[i];
            
            // 检查是否为讨论开始的用户消息
            if (message.role === 'user' && i < messages.length - 1) {
                // 查看后续是否有多个连续的agent消息（讨论消息）
                let discussionMessages = [];
                let summaryMessage = null;
                let j = i + 1;
                let consecutiveAgentCount = 0;
                
                // 收集讨论相关的消息（优先使用标记字段）
                while (j < messages.length && messages[j].role === 'agent') {
                    if (messages[j].is_discussion === true && messages[j].agent_name === '📊 综合分析报告') {
                        summaryMessage = messages[j];
                        j++;
                        break;
                    } else if (messages[j].is_discussion === true || 
                              ['产品经理', '技术总监', '市场专家', 'UX设计师', '商业分析师'].includes(messages[j].agent_name)) {
                        discussionMessages.push(messages[j]);
                        consecutiveAgentCount++;
                    } else {
                        // 遇到其他类型的agent消息，停止收集
                        break;
                    }
                    j++;
                }
                
                // 如果有标记字段，优先使用标记判断；否则使用原来的逻辑
                const uniqueAgents = [...new Set(discussionMessages.map(msg => msg.agent_name))];
                const hasDiscussionMark = discussionMessages.some(msg => msg.is_discussion === true);
                const isDiscussion = hasDiscussionMark || (uniqueAgents.length >= 3) || (discussionMessages.length >= 6);
                
                console.log(`检查讨论: ${discussionMessages.length}条消息, ${uniqueAgents.length}个不同专家, 判断为讨论: ${isDiscussion}`);
                
                if (isDiscussion) {
                    // 显示用户问题
            this.addMessageToUI(message);
                    
                    // 先过滤thinking内容，获取有效的讨论消息
                    const validDiscussionMessages = discussionMessages.map(msg => {
                        const filteredContent = this.filterThinkingContent(msg.content);
                        return {
                            ...msg,
                            content: filteredContent,
                            isValid: filteredContent.trim().length > 20 // 过滤后内容足够长才算有效
                        };
                    }).filter(msg => msg.isValid); // 只保留有效消息
                    
                    console.log(`渲染讨论消息过滤: 原有${discussionMessages.length}条，有效${validDiscussionMessages.length}条`);
                    
                    // 基于有效消息计算参与的专家
                    const uniqueValidAgents = [...new Set(validDiscussionMessages.map(msg => msg.agent_name))];
                    
                    // 过滤掉在agents列表中不存在的agent名称
                    const validAgents = uniqueValidAgents.filter(agentName => {
                        if (!this.agents[agentName]) {
                            console.warn(`Agent ${agentName} not found in render messages, skipping`);
                            return false;
                        }
                        return true;
                    });
                    
                    const rounds = validAgents.length > 0 ? Math.ceil(validDiscussionMessages.length / validAgents.length) : 1;
                    
                    this.currentDiscussionData = {
                        question: message.content,
                        rounds: rounds,
                        agentsCount: validAgents.length,
                        messages: validDiscussionMessages, // 使用过滤后的有效消息
                        includeSummary: !!summaryMessage
                    };
                    
                    // 创建并显示讨论进度条
                    const progressBar = this.createDiscussionProgressBar(
                        message.content, 
                        rounds, 
                        !!summaryMessage, 
                        validAgents.length > 0 ? validAgents : ['未知专家'] // 使用默认值避免空数组
                    );
                    this.updateDiscussionProgressBar(progressBar, 'completed', rounds, validAgents.length);
                    container.appendChild(progressBar);
                    
                    // 如果有总结消息，显示总结
                    if (summaryMessage) {
                        this.addMessageToUI(summaryMessage);
                    }
                    
                    i = j;
                } else {
                    // 正常的单条消息
                    this.addMessageToUI(message);
                    i++;
                }
            } else {
                // 正常的单条消息
                this.addMessageToUI(message);
                i++;
            }
        }

        // 滚动到底部
        container.scrollTop = container.scrollHeight;
    }

    // 专门渲染讨论会话
    renderDiscussionSession(messages) {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        // 找到用户的讨论问题（优先查找有讨论标记的用户消息）
        const userQuestion = messages.find(msg => 
            msg.role === 'user' && msg.is_discussion === true
        ) || messages.find(msg => msg.role === 'user');
        
        if (!userQuestion) {
            // 如果没有用户问题，降级到普通渲染
            this.renderMessages(messages);
            return;
        }

        // 使用标记字段来找到所有讨论消息和总结消息
        const discussionMessages = messages.filter(msg => 
            msg.is_discussion === true && 
            msg.agent_name !== '📊 综合分析报告'
        );
        
        const summaryMessage = messages.find(msg => 
            msg.is_discussion === true && 
            msg.agent_name === '📊 综合分析报告'
        );

        console.log(`讨论会话渲染: ${discussionMessages.length}条讨论消息, 有总结: ${!!summaryMessage}`);

        if (discussionMessages.length > 0) {
            // 显示用户问题
            this.addMessageToUI(userQuestion);

            // 先过滤thinking内容，获取有效的讨论消息
            const validDiscussionMessages = discussionMessages.map(msg => {
                const filteredContent = this.filterThinkingContent(msg.content);
                return {
                    ...msg,
                    content: filteredContent,
                    isValid: filteredContent.trim().length > 20 // 过滤后内容足够长才算有效
                };
            }).filter(msg => msg.isValid); // 只保留有效消息
            
            console.log(`讨论消息过滤: 原有${discussionMessages.length}条，有效${validDiscussionMessages.length}条`);
            
            // 基于有效消息计算参与的专家和轮数
            const uniqueAgents = [...new Set(validDiscussionMessages.map(msg => msg.agent_name))];
            
            // 过滤掉在agents列表中不存在的agent名称
            const validAgents = uniqueAgents.filter(agentName => {
                if (!this.agents[agentName]) {
                    console.warn(`Agent ${agentName} not found in discussion session, skipping`);
                    return false;
                }
                return true;
            });
            
            // 根据有效Agent数量计算轮数
            const rounds = validAgents.length > 0 ? Math.ceil(validDiscussionMessages.length / validAgents.length) : 1;
            
            console.log(`讨论统计: ${validAgents.length}位有效专家, ${rounds}轮讨论, ${validDiscussionMessages.length}条有效发言`);
            
            this.currentDiscussionData = {
                question: userQuestion.content,
                rounds: rounds,
                agentsCount: validAgents.length,
                messages: validDiscussionMessages, // 使用过滤后的有效消息
                includeSummary: !!summaryMessage
            };

            // 创建并显示讨论进度条
            const progressBar = this.createDiscussionProgressBar(
                userQuestion.content, 
                rounds, 
                !!summaryMessage, 
                validAgents.length > 0 ? validAgents : ['未知专家'] // 使用默认值避免空数组
            );
            this.updateDiscussionProgressBar(progressBar, 'completed', rounds, validAgents.length);
            container.appendChild(progressBar);

            // 如果有总结消息，显示总结
            if (summaryMessage) {
                this.addMessageToUI(summaryMessage);
            }

            // 处理其他非讨论消息（如果有的话）
            const otherMessages = messages.filter(msg => 
                msg !== userQuestion && 
                msg.is_discussion !== true
            );
            
            otherMessages.forEach(msg => {
                this.addMessageToUI(msg);
            });
        } else {
            // 没有找到讨论消息，降级到普通渲染
            this.renderMessages(messages);
        }

        // 滚动到底部
        container.scrollTop = container.scrollHeight;
    }

    addMessageToUI(message, isSystemMessage = false) {
        const messagesContainer = document.getElementById('messages-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        messageDiv.dataset.messageId = message.id;

        // 创建头像
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        
        if (message.role === 'user') {
            avatarDiv.textContent = '我';
            avatarDiv.style.background = 'linear-gradient(135deg, #52525b 0%, #3f3f46 100%)';
        } else if (isSystemMessage) {
            avatarDiv.innerHTML = '<i class="fas fa-info-circle"></i>';
            avatarDiv.style.background = 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)';
        } else {
            const agent = this.agents[message.agent_name];
            if (agent) {
                avatarDiv.textContent = agent.name.charAt(0);
                avatarDiv.style.background = agent.color;
            } else {
                avatarDiv.textContent = 'AI';
                avatarDiv.style.background = 'linear-gradient(135deg, #9c81f2 0%, #7c3aed 100%)';
            }
        }

        // 创建消息内容
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // 消息头部（Agent名称和时间）
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        
        const authorSpan = document.createElement('span');
        authorSpan.className = 'message-author';
        if (message.role === 'user') {
            authorSpan.textContent = '我';
        } else if (isSystemMessage) {
            authorSpan.textContent = '系统通知';
        } else {
            authorSpan.textContent = message.agent_name || 'AI';
        }
        headerDiv.appendChild(authorSpan);

        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = formatTime(message.timestamp); // 使用全局函数
        headerDiv.appendChild(timeSpan);

        contentDiv.appendChild(headerDiv);

        // 消息文本
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        // 过滤thinking内容并使用增强的Markdown渲染
        let content = this.filterThinkingContent(message.content);
        
        // 检测是否包含音频链接（更通用的匹配）
        // 匹配包含 audio 关键字的链接，或者以音频扩展名结尾的链接
        const audioUrlMatch = content.match(/(https?:\/\/[^\s]+(?:audio|speech|sound|voice)[^\s]*)|https?:\/\/[^\s]+\.(mp3|wav|ogg|m4a|aac)/i);
        const isAudioGeneration = message.agent_name === 'Hailuo-Speech-02' || content.includes('Generated Audio') || content.includes('Generating Audio');
        
        if (isAudioGeneration && audioUrlMatch) {
            // 提取音频URL（可能包含 "Generated Audio!" 前缀）
            let audioUrl = audioUrlMatch[0];
            
            // 如果URL前面有 "Generated Audio!" 等文本，也要提取
            const fullMatch = content.match(/Generated\s+Audio[!:：\s]*((https?:\/\/[^\s]+))/i);
            if (fullMatch) {
                audioUrl = fullMatch[1];
            }
            
            // 移除URL和相关文本，保留其他内容
            const textWithoutUrl = content
                .replace(/Generated\s+Audio[!:：\s]*/gi, '')
                .replace(/Generating\s+Audio[^)]*\)/gi, '')
                .replace(audioUrl, '')
                .trim();
            
            // 渲染文本部分（如果有）
            if (textWithoutUrl && window.renderEnhancedMarkdown) {
                window.renderEnhancedMarkdown(textWithoutUrl, textDiv);
            } else if (textWithoutUrl) {
                textDiv.innerHTML = this.formatContent(textWithoutUrl, message.role);
            }
            
            // 创建音频播放器
            const audioPlayer = document.createElement('div');
            audioPlayer.className = 'audio-player-container';
            audioPlayer.innerHTML = `
                <div class="audio-player">
                    <div class="audio-icon">🎙️</div>
                    <div class="audio-info">
                        <div class="audio-title">生成的语音</div>
                        <audio controls class="audio-element" preload="metadata">
                            <source src="${audioUrl}" type="audio/mpeg">
                            您的浏览器不支持音频播放。
                        </audio>
                    </div>
                    <a href="${audioUrl}" download="hailuo-speech.mp3" class="audio-download" title="下载音频">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
            `;
            textDiv.appendChild(audioPlayer);
        } else {
            // 正常渲染 Markdown
            if (window.renderEnhancedMarkdown && typeof window.renderEnhancedMarkdown === 'function') {
                window.renderEnhancedMarkdown(content, textDiv);
            } else {
                // 降级为普通渲染
                textDiv.innerHTML = this.formatContent(content, message.role);
            }
        }
        
        contentDiv.appendChild(textDiv);

        // 添加附件显示（如果有）
        if (message.attachments && message.attachments.length > 0) {
            const attachmentsDiv = document.createElement('div');
            attachmentsDiv.className = 'message-attachments';
            
            message.attachments.forEach(file => {
                const fileType = file.file_type || 'unknown';
                const isImage = ['png', 'jpg', 'jpeg'].includes(fileType.toLowerCase());
                
                const attachmentItem = document.createElement('div');
                attachmentItem.className = 'message-attachment-item';
                
                attachmentItem.innerHTML = `
                    <div class="message-attachment-icon ${fileType.toLowerCase()}">
                        ${isImage ? '📷' : fileType.toUpperCase()}
                    </div>
                    <div class="message-attachment-info">
                        <div class="message-attachment-name">${file.filename}</div>
                        <div class="message-attachment-size">${this.formatFileSize(file.file_size)}</div>
                    </div>
                `;
                
                attachmentsDiv.appendChild(attachmentItem);
            });
            
            contentDiv.appendChild(attachmentsDiv);
        }

        // 组装消息
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        // 添加到容器
        messagesContainer.appendChild(messageDiv);
        
        // 为消息中的图片添加点击事件（放大查看）
        const images = messageDiv.querySelectorAll('.message-text img');
        images.forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showImageModal(img.src);
            });
            
            // 添加图片加载错误处理
            img.addEventListener('error', (e) => {
                console.error('图片加载失败:', img.src);
                img.alt = '❌ 图片加载失败';
                img.style.display = 'none';
                const errorMsg = document.createElement('div');
                errorMsg.className = 'image-error';
                errorMsg.textContent = '图片加载失败';
                img.parentNode.insertBefore(errorMsg, img);
            });
        });
        
        this.scrollToBottom();
    }

    createAvatar(message) {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        if (message.role === 'user') {
            avatar.style.background = '#6B7280';
            avatar.textContent = '我';
        } else if (message.role === 'system') {
            avatar.style.background = '#10B981';
            avatar.textContent = '💡';
        } else {
            const agent = this.agents[message.agent_name];
            if (agent) {
                avatar.style.background = agent.color;
                avatar.textContent = agent.name.charAt(0);
            } else {
                avatar.style.background = '#9CA3AF';
                avatar.textContent = 'AI';
            }
        }

        return avatar;
    }

    createMessageContent(message) {
        const content = document.createElement('div');
        content.className = 'message-content';

        const info = document.createElement('div');
        info.className = 'message-info';

        const name = document.createElement('span');
        name.className = 'agent-name';
        name.textContent = message.role === 'user' ? '我' : message.agent_name || 'AI助手';

        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        info.appendChild(name);
        info.appendChild(time);

        const text = document.createElement('div');
        text.className = 'message-text';
        
        // 调试信息：打印原始内容长度
        console.log(`消息内容长度: ${message.content?.length || 0}`, message.agent_name || 'user');
        if (message.content && message.content.length > 500) {
            console.log(`长消息预览: ${message.content.substring(0, 100)}...`);
        }
        
        // 处理消息内容，保持换行和格式
        text.innerHTML = this.formatMessageContent(message.content, message.role);

        content.appendChild(info);
        content.appendChild(text);

        // 如果是用户消息并且有附件，显示附件列表
        if (message.role === 'user' && message.attachments && message.attachments.length > 0) {
            const attachmentsContainer = this.createAttachmentsDisplay(message.attachments);
            content.appendChild(attachmentsContainer);
        }

        return content;
    }

    // 创建附件显示组件
    createAttachmentsDisplay(attachments) {
        const attachmentsContainer = document.createElement('div');
        attachmentsContainer.className = 'message-attachments';

        attachments.forEach(attachment => {
            const attachmentItem = document.createElement('div');
            attachmentItem.className = 'message-attachment-item';
            
            const fileType = this.getFileTypeClass(attachment.file_type);
            const fileSize = this.formatFileSize(attachment.file_size);
            
            attachmentItem.innerHTML = `
                <div class="message-attachment-icon ${fileType}">
                    ${this.getFileTypeIcon(attachment.file_type)}
                </div>
                <div class="message-attachment-info">
                    <div class="message-attachment-name" title="${attachment.filename}">${attachment.filename}</div>
                    <div class="message-attachment-size">${fileSize}</div>
                </div>
            `;
            
            attachmentsContainer.appendChild(attachmentItem);
        });

        return attachmentsContainer;
    }

    formatMessageContent(content, role = 'agent') {
        // 首先过滤掉thinking内容
        content = this.filterThinkingContent(content);
        
        // 清理多余的空行，优化排版
        content = content
            .replace(/\n{3,}/g, '\n\n')  // 将3个或更多连续换行替换为2个
            .replace(/^\n+/, '')         // 移除开头的换行
            .replace(/\n+$/, '')         // 移除结尾的换行
            .trim();
        
        // 根据消息角色确定@提及的样式
        const mentionStyle = role === 'user' 
            ? 'color: white; font-weight: 600; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);' // 用户消息：白色加阴影
            : 'color: #4F46E5; font-weight: 600;'; // Agent消息：蓝色
        
        try {
            // 使用marked.js渲染Markdown
            if (window.marked) {
                // 配置marked选项 - 禁用breaks以减少不必要的<br>
                marked.setOptions({
                    breaks: false,  // 改为false，减少自动换行
                    gfm: true,
                    sanitize: false
                });
                
                let formattedContent = marked.parse(content);
                
                // 清理HTML中多余的空白段落
                formattedContent = formattedContent
                    .replace(/<p>\s*<\/p>/g, '')  // 移除空的<p>标签
                    .replace(/(<\/p>)\s*(<p>)/g, '$1$2')  // 移除<p>标签间的空白
                    .replace(/(<br\s*\/?>){2,}/g, '<br>')  // 多个连续<br>替换为一个
                    .replace(/^\s*<br\s*\/?>/, '')  // 移除开头的<br>
                    .replace(/<br\s*\/?>(\s*<\/[^>]+>)*\s*$/, '');  // 移除结尾的<br>
                
                // 高亮@提及，根据角色使用不同颜色
                formattedContent = formattedContent.replace(/@(\S+)/g, `<span style="${mentionStyle}">@$1</span>`);
                
                return formattedContent;
            }
        } catch (error) {
            console.warn('Markdown渲染失败，使用纯文本:', error);
        }

        // 降级到纯文本处理
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        let formattedContent = escapeHtml(content);
        
        // 优化纯文本换行处理，避免过多空行
        formattedContent = formattedContent
            .replace(/\n{2,}/g, '<br><br>')  // 两个或更多换行转为两个<br>
            .replace(/\n/g, '<br>')          // 单个换行转为一个<br>
            .replace(/(<br>){3,}/g, '<br><br>'); // 清理过多的连续<br>
        
        formattedContent = formattedContent.replace(/@(\S+)/g, `<span style="${mentionStyle}">@$1</span>`);
        formattedContent = formattedContent.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #3B82F6; text-decoration: underline;">$1</a>');
        
        return formattedContent;
    }

    // 过滤thinking内容
    filterThinkingContent(content) {
        if (!content) return content;
        
        let filteredContent = content;
        
        // 更全面的思考过程模式匹配（与后端保持一致）
        const thinkingPatterns = [
            // 完整的thinking块（处理*Thinking...*格式） - 修复：只匹配到正文开始前
            /^\*?Thinking\.{3}\*?[\s\S]*?(?=\n好的|### |##|^[一二三四五六七八九十]+[、\.]|^\d+\.|^[*-]\s|\n\n[^>\s])/mi,
            /^思考中\.{3}[\s\S]*?(?=\n好的|### |##|^[一二三四五六七八九十]+[、\.]|^\d+\.|^[*-]\s|\n\n[^>\s])/mi,
            
            // 处理markdown引用格式的thinking（> **标题**） - 修复：只匹配到非引用内容
            /^>[\s\S]*?(?=\n\n[^>\s]|### |##)/mi,
            
            // 基本的thinking标识
            /Thinking\.{3}[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /思考中\.{3}[\s\S]*?(?=\n[A-Z\u4e00-\u9fff])/gmi,
            
            // 具体的思考过程标识
            /Deconstructing[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /Assessing[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /Framing[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /Defining[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /Mapping[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /Positioning[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /Analyzing[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /Considering[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            
            // 特定的思考短语
            /Framing User Intentions[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /Mapping Opportunity Landscapes[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /Positioning the Narrative[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /Deconstructing Market Entry[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            
            // 以I'm开头的思考句子
            /I'm now[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi,
            /I've[\s\S]*?(?=\n[A-Z\u4e00-\u9fff][^a-z\n]*[:：\n]|\n\d+\.)/gmi
        ];
        
        // 应用所有模式
        thinkingPatterns.forEach(pattern => {
            const oldLength = filteredContent.length;
            filteredContent = filteredContent.replace(pattern, '');
            if (filteredContent.length < oldLength) {
                console.log('过滤模式匹配:', pattern.toString().substring(0, 50) + '...');
            }
        });
        
        // 按行进一步处理
        const lines = filteredContent.split('\n');
        const filteredLines = [];
        let skipUntilContent = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // 检测思考过程行（与后端保持一致）
            if (trimmedLine.match(/^\*?Thinking\.{3}\*?/i) ||
                trimmedLine.match(/^思考中\.{3}/i) ||
                trimmedLine.match(/^>/i) ||  // markdown引用块
                trimmedLine.match(/^(I'm now|I've|Deconstructing|Assessing|Framing|Mapping|Positioning|Defining|Analyzing|Considering)/i) ||
                trimmedLine.includes('User Intentions') ||
                trimmedLine.includes('Opportunity Landscapes') ||
                trimmedLine.includes('Market Entry') ||
                trimmedLine.includes('the Narrative')) {
                skipUntilContent = true;
                continue;
            }
            
            // 如果正在跳过，检查是否遇到实质内容
            if (skipUntilContent) {
                if (trimmedLine.match(/^\d+\./) ||  // 数字列表
                    trimmedLine.match(/^[一二三四五六七八九十]+[、\.]/) || // 中文序号
                    trimmedLine.match(/^#+\s/) ||  // 标题
                    trimmedLine.match(/^\*\*[^*]+\*\*/) || // 粗体标题
                    (trimmedLine.length > 15 && 
                     (trimmedLine.endsWith('：') || trimmedLine.endsWith(':') || 
                      trimmedLine.endsWith('。') || trimmedLine.endsWith('！') || trimmedLine.endsWith('？')) &&
                     !trimmedLine.match(/^(I'm|I've|The|This|My)/))) {
                    skipUntilContent = false;
                    filteredLines.push(line);
                }
                // 继续跳过
            } else {
                filteredLines.push(line);
            }
        }
        
        const result = filteredLines.join('\n')
            .replace(/\n{3,}/g, '\n\n')  // 移除多余的空行
            .trim();
        
        // 调试信息
        if (result.length < content.length * 0.6) {
            console.log('过滤了thinking内容:');
            console.log('原长度:', content.length, '过滤后长度:', result.length);
            console.log('过滤前开头:', content.substring(0, 200));
            console.log('过滤后开头:', result.substring(0, 200));
        }
        
        return result;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message) return;

        // 禁用输入
        input.disabled = true;
        document.getElementById('send-btn').disabled = true;

        try {
            // 检测@提及的Agent
            let mentionedAgents = [];
            for (const agentName of Object.keys(this.agents)) {
                if (message.includes(`@${agentName}`)) {
                    mentionedAgents.push(agentName);
                }
            }

            // 确定要使用的Agent
            let selectedAgent = null;
            if (mentionedAgents.length > 0) {
                if (mentionedAgents.length === 1) {
                    selectedAgent = mentionedAgents[0];
                } else {
                    selectedAgent = null;
                }
            } else if (this.selectedAgent) {
                selectedAgent = this.selectedAgent;
            } else {
                selectedAgent = null;
            }

            // 添加用户消息到UI
            const userMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: message,
                timestamp: new Date().toISOString(),
                attachments: this.uploadedFiles.length > 0 ? [...this.uploadedFiles] : null
            };
            this.addMessageToUI(userMessage);

            // 准备发送数据
            const sendData = {
                message: message,
                agent_name: selectedAgent,
                session_id: this.currentSessionId,
                file_ids: this.uploadedFiles.map(f => f.file_id)
            };
            
            // 清空输入框和文件列表
            input.value = '';
            input.style.height = 'auto';
            this.uploadedFiles = [];
            this.renderFileAttachments();
            
            this.lastUserMessage = message;

            // 显示AI思考动画
            const displayAgent = mentionedAgents.length > 0 ? mentionedAgents[0] : (selectedAgent || 'GPT5');
            this.showTypingIndicator(displayAgent);

            // 隐藏欢迎消息
            const welcomeMessage = document.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'none';
            }

            // 使用流式输出
            await this.sendMessageStream(sendData, displayAgent);

        } catch (error) {
            console.error('发送消息失败:', error);
            this.hideTypingIndicator();
            alert('发送消息失败，请重试');
        } finally {
            // 恢复输入
            input.disabled = false;
            document.getElementById('send-btn').disabled = false;
            input.focus();
        }
    }

    async sendMessageStream(sendData, agentName) {
        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sendData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // 隐藏思考动画
            this.hideTypingIndicator();

            // 创建流式消息容器
            const messageId = `stream-${Date.now()}`;
            const streamMessage = {
                id: messageId,
                role: 'agent',
                agent_name: agentName,
                content: '',
                timestamp: new Date().toISOString()
            };

            // 添加空消息到UI（将会被流式更新）
            this.addMessageToUI(streamMessage);
            
            // 获取消息元素
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            const messageTextDiv = messageElement.querySelector('.message-text');

            // 读取流
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    // 流结束，完成最终渲染
                    if (accumulatedContent && window.renderEnhancedMarkdown) {
                        window.renderEnhancedMarkdown(accumulatedContent, messageTextDiv);
                    }
                    
                    // 检测并渲染音频播放器
                    this.renderAudioPlayer(messageTextDiv, accumulatedContent);
                    
                    // 刷新会话列表（重要！确保新会话出现在左侧）
                    await this.loadSessions();
                    this.renderSessions();
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留不完整的行

                for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    try {
                        // 兼容两种格式：SSE (data: {...}) 和 NDJSON ({...})
                        let jsonStr = line;
                        if (line.startsWith('data: ')) {
                            jsonStr = line.slice(6);
                        }
                        
                        const data = JSON.parse(jsonStr);
                        
                        // 兼容两种元数据类型
                        if (data.type === 'metadata' || data.type === 'meta') {
                            // 更新会话ID和Agent名称
                            this.currentSessionId = data.session_id;
                            const agentName = data.agent_name || data.agent;
                            streamMessage.agent_name = agentName;
                            
                            // 立即刷新会话列表（新会话刚创建）
                            if (data.session_id) {
                                await this.loadSessions();
                                this.renderSessions();
                            }
                            
                            // 更新头像
                            const agent = this.agents[agentName];
                            if (agent) {
                                const avatarDiv = messageElement.querySelector('.message-avatar');
                                avatarDiv.textContent = agent.name.charAt(0);
                                avatarDiv.style.background = agent.color;
                                
                                const authorSpan = messageElement.querySelector('.message-author');
                                authorSpan.textContent = agent.name;
                            }
                        } else if (data.type === 'content') {
                            // 累积内容并实时渲染
                            accumulatedContent += data.content;
                            streamMessage.content = accumulatedContent;
                            
                            // 使用流式 Markdown 渲染（轻量级）
                            if (window.renderStreamingMarkdown) {
                                window.renderStreamingMarkdown(accumulatedContent, messageTextDiv);
                            } else {
                                messageTextDiv.textContent = accumulatedContent;
                            }
                            
                            // 保持滚动到底部
                            this.scrollToBottom();
                        } else if (data.type === 'done') {
                            // 完成时使用完整的增强渲染
                            if (window.renderEnhancedMarkdown) {
                                window.renderEnhancedMarkdown(accumulatedContent, messageTextDiv);
                            }
                            
                            // 检测并渲染音频播放器
                            this.renderAudioPlayer(messageTextDiv, accumulatedContent);
                            
                            // 刷新会话列表
                            await this.loadSessions();
                            this.renderSessions();
                        } else if (data.type === 'error') {
                            console.error('流式输出错误:', data.error);
                            messageTextDiv.innerHTML = `<div class="error-message">❌ 生成失败: ${data.error}</div>`;
                        }
                    } catch (e) {
                        console.error('解析流数据失败:', e, line);
                    }
                }
            }

        } catch (error) {
            console.error('流式请求失败:', error);
            throw error;
        }
    }

    // 按顺序显示多个Agent的思考动画和回复
    async showMultiAgentResponses(messages, agents) {
        // 第一个Agent的思考动画已经在显示了，隐藏它并显示第一个回复
        this.hideTypingIndicator();
        this.addMessageToUI(messages[0].message);
        
        // 从第二个Agent开始，显示思考动画然后显示回复
        for (let i = 1; i < messages.length; i++) {
            // 等待一小段时间再开始下一个Agent
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // 显示当前Agent的思考动画
            this.showTypingIndicator(agents[i]);
            
            // 等待一段时间模拟思考过程
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 隐藏思考动画并显示回复
            this.hideTypingIndicator();
            this.addMessageToUI(messages[i].message);
        }
        
        // 显示系统提示消息
        await new Promise(resolve => setTimeout(resolve, 500));
        const systemMessage = {
            id: `system-${Date.now()}`,
            role: "system",
            content: `✨ ${agents.join('、')} 已按顺序回答了您的问题`,
            agent_name: "系统提示",
            timestamp: new Date().toISOString()
        };
        this.addMessageToUI(systemMessage);
    }

    createNewChat() {
        this.currentSessionId = null;
        this.selectedAgent = null;
        
        // 清除Agent选中状态
        document.querySelectorAll('.agent-item').forEach(item => {
            item.classList.remove('selected');
        });

        // 清除会话选中状态
        document.querySelectorAll('.session-item').forEach(item => {
            item.classList.remove('active');
        });

        // 清空消息区域，显示欢迎消息
        const container = document.getElementById('messages-container');
        container.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-content">
                    <i class="fas fa-robot"></i>
                    <h3>欢迎使用Multi-Agent智能助手</h3>
                    <p>在右侧选择专业角色，或在消息中使用 @ 提及特定专家来获得专业建议</p>
                </div>
            </div>
        `;

        // 清空输入框
        document.getElementById('message-input').value = '';
        document.getElementById('message-input').focus();
        
        this.lastUserMessage = null;
    }

    // 显示讨论面板
    showDiscussionPanel() {
        console.log('📋 showDiscussionPanel 被调用');
        
        const discussionPanel = document.getElementById('discussion-panel');
        const questionInput = document.getElementById('discussion-question-input');
        
        if (!discussionPanel) {
            console.error('❌ 讨论面板元素未找到');
            return;
        }
        
        if (!questionInput) {
            console.error('❌ 讨论问题输入框未找到');
            return;
        }
        
        // 预填充讨论问题
        if (this.lastUserMessage) {
            questionInput.value = this.lastUserMessage;
        } else {
            // 尝试从当前输入框获取内容
            const currentInput = document.getElementById('message-input').value.trim();
            if (currentInput) {
                questionInput.value = currentInput;
            }
        }
        
        // 显示讨论面板（使用 flex 以支持居中布局）
        discussionPanel.style.display = 'flex';
        
        // 调试信息：检查面板的实际样式和位置
        const panelStyles = window.getComputedStyle(discussionPanel);
        console.log('✅ 讨论面板已显示');
        console.log('📊 面板状态:', {
            display: panelStyles.display,
            position: panelStyles.position,
            zIndex: panelStyles.zIndex,
            bottom: panelStyles.bottom,
            left: panelStyles.left,
            right: panelStyles.right,
            opacity: panelStyles.opacity,
            visibility: panelStyles.visibility,
            height: discussionPanel.offsetHeight,
            width: discussionPanel.offsetWidth
        });
        
        // 检查面板是否在视口内
        const rect = discussionPanel.getBoundingClientRect();
        console.log('📐 面板位置:', {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight
        });
        
        // 聚焦到问题输入框
        setTimeout(() => {
            questionInput.focus();
        }, 100);
    }

    // 隐藏讨论面板
    hideDiscussionPanel() {
        document.getElementById('discussion-panel').style.display = 'none';
    }

    // 开始多智能体讨论
    async startDiscussion() {
        // 从讨论面板获取讨论问题
        const questionInput = document.getElementById('discussion-question-input');
        const discussionQuestion = questionInput.value.trim();
        
        if (!discussionQuestion) {
            alert('请输入讨论问题');
            questionInput.focus();
                return;
            }
            
                // 🔧 确保agents数据已加载
        if (Object.keys(this.agents).length === 0) {
            console.log('⚠️ agents数据未加载，重新加载...');
            await this.loadAgents();
        }
        
        // 获取选中的Agent
        const selectedAgents = this.getSelectedAgents();
        console.log('🎯 选中的专家:', selectedAgents);
        
        if (selectedAgents.length < 2) {
            alert('请至少选择2位专家参与讨论');
                return;
        }

        const rounds = parseInt(document.getElementById('discussion-rounds').value);
        const includeSummary = document.getElementById('include-summary').checked;
        const startBtn = document.getElementById('start-discussion-btn');
        
        // 隐藏欢迎消息和讨论面板
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        this.hideDiscussionPanel();
        
        // 清空主输入框
        const mainInput = document.getElementById('message-input');
        if (mainInput.value.trim() === discussionQuestion) {
            mainInput.value = '';
        }
        
        // 🚀 先显示进度条，再开始讨论
        try {
            // 1. 立即显示进度条和通知
            const progressBar = this.createDiscussionProgressBar(discussionQuestion, rounds, includeSummary, selectedAgents);
            document.getElementById('messages-container').appendChild(progressBar);
            this.updateDiscussionProgressBar(progressBar, 'in_progress', 0, selectedAgents.length, rounds);
            this.showTaskNotification('📋 讨论已开始，专家们正在深入讨论中...', 'info');
            
            console.log('🚀 开始调用讨论API...');
            
            // 2. 发起讨论请求
            const response = await fetch('/api/discussion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: discussionQuestion,
                    rounds: rounds,
                    include_summary: includeSummary,
                    selected_agents: selectedAgents,
                    session_id: null,
                    file_ids: this.discussionFiles.map(f => f.file_id)
                })
            });

            const data = await response.json();
            console.log('✅ 讨论API响应:', data);
            
            // 3. 更新进度条为完成状态（短暂显示）
            this.updateDiscussionProgressBar(progressBar, 'completed', selectedAgents.length, selectedAgents.length, rounds);
            this.showTaskNotification('✅ 讨论已完成！', 'success');
            
            // 4. 延迟一下，让用户看到完成状态
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 5. 设置当前会话ID并刷新
            this.currentSessionId = data.session_id;
            await this.loadSessions();
            this.renderSessions();
            
            // 6. 加载并显示讨论结果（这会替换进度条，显示真实的讨论内容）
            await this.loadSession(data.session_id);
            
            // 7. 清空表单
            this.clearDiscussionForm();
            
        } catch (error) {
            console.error('❌ 讨论失败:', error);
            this.showTaskNotification(`❌ 讨论失败: ${error.message}`, 'error');
        }
    }

    // 创建讨论进度条
    createDiscussionProgressBar(question, rounds, includeSummary, selectedAgents) {
        const progressBar = document.createElement('div');
        progressBar.className = 'discussion-progress-bar';
        progressBar.id = 'current-discussion-progress';
        
        console.log('🎨 创建进度条，参与专家:', selectedAgents);
        console.log('📊 可用agents数据:', Object.keys(this.agents));
        
        // 🔧 确保selectedAgents不为空
        const validAgents = selectedAgents && selectedAgents.length > 0 ? selectedAgents : ['产品经理', '技术总监'];
        
        // 生成参与专家的显示信息
        const agentAvatars = validAgents.map(agentName => {
            const agent = this.agents[agentName];
            console.log(`🎯 处理专家: ${agentName}, 找到数据:`, !!agent);
            
            if (!agent) {
                console.warn(`⚠️ Agent ${agentName} not found, 使用默认显示`);
                // 为未找到的agent使用默认颜色，但仍显示名称
                return `<div class="discussion-agent-avatar" style="background: #6c757d" title="${agentName}">${agentName.charAt(0)}</div>`;
            }
            return `<div class="discussion-agent-avatar" style="background: ${agent.color}" title="${agentName}">${agentName.charAt(0)}</div>`;
        }).join('');
        
        progressBar.innerHTML = `
            <div class="discussion-progress-header">
                <div class="discussion-progress-title">
                    <i class="fas fa-users"></i>
                    <span>多智能体讨论</span>
                </div>
                <div class="discussion-progress-badge">进行中</div>
            </div>
            <div class="discussion-progress-body">
                <div class="discussion-progress-info">
                    <div class="discussion-progress-text">正在进行${rounds}轮专家讨论...</div>
                    <div class="discussion-progress-stats">0/${rounds}轮完成</div>
                    <div class="discussion-current-status" id="discussion-current-status" style="display: none;">
                        <div class="current-speaker">
                            <i class="fas fa-microphone"></i>
                            <span id="current-speaker-name">准备中...</span>
                        </div>
                        <div class="current-action" id="current-action">
                            <span class="action-text">初始化讨论...</span>
                            <span class="action-spinner" style="display: none;">
                                <i class="fas fa-spinner fa-spin"></i>
                            </span>
                        </div>
                    </div>
                </div>
                <div class="discussion-agents-preview">
                    <strong>参与专家：</strong>
                    <div class="discussion-agents-avatars">
                        ${agentAvatars}
                    </div>
                </div>
                <div class="discussion-progress-question">
                    <strong>讨论问题：</strong>
                    <div class="discussion-question-text">${question}</div>
                </div>
            </div>
        `;
        
        // 添加点击事件
        progressBar.addEventListener('click', () => {
            if (this.currentDiscussionData) {
                this.showDiscussionDetails();
            }
        });
        
        return progressBar;
    }

    // 更新讨论进度条状态
    updateDiscussionProgressBar(progressBar, status, completedRounds = 0, agentsCount = 0, totalRoundsOrMessageCount = null) {
        const badge = progressBar.querySelector('.discussion-progress-badge');
        const text = progressBar.querySelector('.discussion-progress-text');
        const stats = progressBar.querySelector('.discussion-progress-stats');
        
        console.log(`🔄 更新进度条: status=${status}, rounds=${completedRounds}, agents=${agentsCount}, messages=${totalRoundsOrMessageCount}`);
        
        if (status === 'in_progress') {
            badge.textContent = '进行中';
            badge.style.background = '#F59E0B';
            text.textContent = '专家们正在深度讨论中，请稍候...';
            const totalRounds = totalRoundsOrMessageCount || completedRounds;
            stats.textContent = `${totalRounds}轮讨论，${agentsCount}位专家参与`;
            progressBar.style.cursor = 'default';
        } else if (status === 'completed') {
            badge.textContent = '已完成';
            badge.style.background = '#10B981';
            text.textContent = '讨论已完成，点击查看详情';
            
            // 🔧 使用传递的实际发言数，如果没有则估算
            let totalMessages = 0;
            if (typeof totalRoundsOrMessageCount === 'number') {
                // 如果传递了实际发言数，直接使用
                totalMessages = totalRoundsOrMessageCount;
            } else if (this.currentDiscussionData && this.currentDiscussionData.messages) {
                // 从当前讨论数据计算
                totalMessages = this.currentDiscussionData.messages.filter(msg => 
                    msg.agent_name && msg.agent_name !== '📊 综合分析报告'
                ).length;
            } else {
                // 估算值
                totalMessages = completedRounds * agentsCount;
            }
                
            stats.textContent = `${completedRounds}轮讨论，${agentsCount}位专家，${totalMessages}条发言`;
            progressBar.style.cursor = 'pointer';
            
            console.log(`✅ 进度条更新完成: ${completedRounds}轮, ${agentsCount}专家, ${totalMessages}发言`);
        } else if (status === 'error') {
            badge.textContent = '失败';
            badge.style.background = '#EF4444';
            text.textContent = typeof totalRoundsOrMessageCount === 'string' ? totalRoundsOrMessageCount : '讨论过程中发生错误';
            stats.textContent = '点击重试';
            progressBar.style.cursor = 'default';
        }
    }

    // 显示讨论详情弹窗
    showDiscussionDetails() {
        if (!this.currentDiscussionData) return;
        
        const modal = document.getElementById('discussion-details-modal');
        const content = document.getElementById('discussion-details-content');
        const overlay = document.getElementById('modal-overlay');
        
        // 构建讨论详情内容
        let detailsHTML = `
            <div style="margin-bottom: 20px;">
                <h4>
                    <i class="fas fa-question-circle"></i>
                    讨论问题
                </h4>
                <div class="discussion-question-box">
                    ${this.currentDiscussionData.question}
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4>
                    <i class="fas fa-info-circle"></i>
                    讨论统计
                </h4>
                <div class="discussion-stats-grid">
                    <div class="discussion-stat-card">
                        <div class="discussion-stat-value">${this.currentDiscussionData.rounds}</div>
                        <div class="discussion-stat-label">讨论轮次</div>
                    </div>
                    <div class="discussion-stat-card">
                        <div class="discussion-stat-value">${this.currentDiscussionData.agentsCount}</div>
                        <div class="discussion-stat-label">参与专家</div>
                    </div>
                    <div class="discussion-stat-card">
                        <div class="discussion-stat-value">${this.currentDiscussionData.messages.length}</div>
                        <div class="discussion-stat-label">总发言数</div>
                    </div>
                </div>
            </div>
        `;
        
        // 按轮次分组显示讨论内容
        const discussionMessages = this.currentDiscussionData.messages.filter(msg => msg.agent_name !== '📊 综合分析报告');
        const rounds = this.currentDiscussionData.rounds;
        
        // 获取所有参与的Agent
        const allParticipants = [...new Set(discussionMessages.map(msg => msg.agent_name))];
        const messagesPerRound = allParticipants.length;
        
        console.log(`讨论详情统计: ${discussionMessages.length}条消息, ${rounds}轮, 每轮${messagesPerRound}位专家`);
        
        detailsHTML += `<h4>
            <i class="fas fa-comments"></i>讨论过程
            <span style="font-size: 12px; font-weight: normal; color: var(--text-tertiary); margin-left: 8px;">
                (${allParticipants.length}位专家 × ${rounds}轮 = ${discussionMessages.length}条发言)
            </span>
        </h4>`;
        
        for (let round = 1; round <= rounds; round++) {
            const startIndex = (round - 1) * messagesPerRound;
            const endIndex = round * messagesPerRound;
            const roundMessages = discussionMessages.slice(startIndex, endIndex);
            
            // 统计本轮参与的专家
            const roundParticipants = [...new Set(roundMessages.map(msg => msg.agent_name))];
            
            detailsHTML += `
                <div class="discussion-round-group">
                    <div class="discussion-round-header">
                        <span>第${round}轮讨论</span>
                        <span style="font-size: 11px; opacity: 0.9;">${roundParticipants.length}/${allParticipants.length}位专家参与</span>
                    </div>
            `;
            
            // 按发言顺序显示
            roundMessages.forEach((message, index) => {
                const agent = this.agents[message.agent_name];
                detailsHTML += `
                    <div class="discussion-message-item">
                        <div class="discussion-message-avatar" style="background: ${agent ? agent.color : '#9CA3AF'};">
                            ${agent ? agent.name.charAt(0) : 'AI'}
                        </div>
                        <div class="discussion-message-content">
                            <div class="discussion-message-header">
                                <span class="discussion-message-author">${message.agent_name}</span>
                                <span class="discussion-message-badge">
                                    第${index + 1}个发言
                                </span>
                                <span class="discussion-message-time">${new Date(message.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}</span>
                            </div>
                            <div class="discussion-message-body">
                                ${this.formatMessageContent(message.content, message.role || 'agent')}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            detailsHTML += '</div>';
        }
        
        content.innerHTML = detailsHTML;
        
        // 显示弹窗（使用flex布局以居中显示）
        modal.style.display = 'flex';
    }

    // 隐藏讨论详情弹窗
    hideDiscussionDetails() {
        const modal = document.getElementById('discussion-details-modal');
        
        modal.style.display = 'none';
    }



    // 显示AI思考动画
    showTypingIndicator(agentName) {
        const container = document.getElementById('messages-container');
        const typingElement = document.createElement('div');
        typingElement.className = 'message agent thinking';
        typingElement.id = 'typing-indicator-message';

        const agent = this.agents[agentName];
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.style.background = agent ? agent.color : '#9CA3AF';
        avatar.textContent = agent ? agent.name.charAt(0) : 'AI';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = `
            <div class="message-info">
                <span class="agent-name">${agentName || 'AI助手'}</span>
                <span class="message-time">正在思考...</span>
            </div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        typingElement.appendChild(avatar);
        typingElement.appendChild(content);
        container.appendChild(typingElement);
        container.scrollTop = container.scrollHeight;
    }

    hideTypingIndicator() {
        const typingElement = document.getElementById('typing-indicator-message');
        if (typingElement) {
            typingElement.remove();
        }
    }

    // 处理@提及输入
    handleMentionInput(e) {
        const input = e.target;
        const value = input.value;
        const cursorPos = input.selectionStart;
        
        // 检查光标前是否有@符号
        const beforeCursor = value.substring(0, cursorPos);
        const atMatch = beforeCursor.match(/@(\w*)$/);
        
        if (atMatch) {
            const searchTerm = atMatch[1].toLowerCase();
            this.showMentionDropdown(searchTerm);
        } else {
            this.hideMentionDropdown();
        }
    }

    // 显示@提及下拉菜单
    showMentionDropdown(searchTerm = '') {
        const dropdown = document.getElementById('mention-dropdown');
        dropdown.innerHTML = '';
        
        const agentNames = Object.keys(this.agents);
        const filteredAgents = agentNames.filter(name => 
            name.toLowerCase().includes(searchTerm)
        );

        if (filteredAgents.length === 0) {
            this.hideMentionDropdown();
            return;
        }

        filteredAgents.forEach((agentName, index) => {
            const agent = this.agents[agentName];
            if (!agent) {
                console.warn(`Agent ${agentName} not found in mention dropdown`);
                return; // 跳过不存在的agent
            }
            
            const option = document.createElement('div');
            option.className = 'mention-option';
            if (index === this.selectedMentionIndex) {
                option.classList.add('selected');
            }
            
            option.innerHTML = `
                <div class="mention-avatar" style="background: ${agent.color}">
                    ${agent.name.charAt(0)}
                </div>
                <div class="mention-info">
                    <div class="mention-name">${agent.name}</div>
                    <div class="mention-description">${this.getAgentDescription(agent.name)}</div>
                </div>
            `;

            option.addEventListener('click', () => {
                this.insertMention(agentName);
            });

            dropdown.appendChild(option);
        });

        dropdown.style.display = 'block';
        this.mentionDropdownVisible = true;
        this.selectedMentionIndex = 0;
        this.updateMentionSelection();
    }

    // 隐藏@提及下拉菜单
    hideMentionDropdown() {
        const dropdown = document.getElementById('mention-dropdown');
        dropdown.style.display = 'none';
        this.mentionDropdownVisible = false;
        this.selectedMentionIndex = -1;
    }

    // 导航@提及下拉菜单
    navigateMentionDropdown(direction) {
        const options = document.querySelectorAll('.mention-option');
        if (options.length === 0) return;

        this.selectedMentionIndex += direction;
        
        if (this.selectedMentionIndex < 0) {
            this.selectedMentionIndex = options.length - 1;
        } else if (this.selectedMentionIndex >= options.length) {
            this.selectedMentionIndex = 0;
        }

        this.updateMentionSelection();
    }

    // 更新@提及选择状态
    updateMentionSelection() {
        const options = document.querySelectorAll('.mention-option');
        options.forEach((option, index) => {
            if (index === this.selectedMentionIndex) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    // 选择@提及选项
    selectMentionOption() {
        const options = document.querySelectorAll('.mention-option');
        if (options[this.selectedMentionIndex]) {
            const agentName = options[this.selectedMentionIndex].querySelector('.mention-name').textContent;
            this.insertMention(agentName);
        }
    }

    // 插入@提及
    insertMention(agentName) {
        const input = document.getElementById('message-input');
        const value = input.value;
        const cursorPos = input.selectionStart;
        
        // 找到@符号的位置
        const beforeCursor = value.substring(0, cursorPos);
        const atIndex = beforeCursor.lastIndexOf('@');
        
        if (atIndex !== -1) {
            const newValue = value.substring(0, atIndex) + `@${agentName} ` + value.substring(cursorPos);
            input.value = newValue;
            
            // 设置光标位置
            const newCursorPos = atIndex + agentName.length + 2;
            input.setSelectionRange(newCursorPos, newCursorPos);
            
            this.hideMentionDropdown();
            input.focus();
        }
    }

    // 文件上传相关方法
    isDragValid(e) {
        return e.dataTransfer && e.dataTransfer.types.includes('Files');
    }

    async handleFileUpload(files) {
        const fileUploadBtn = document.getElementById('file-upload-btn');
        
        // 设置上传状态
        fileUploadBtn.classList.add('uploading');
        fileUploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            for (let file of files) {
                // 检查文件类型
                if (!this.isValidFileType(file)) {
                    this.showError(`不支持的文件类型: ${file.name}`);
                    continue;
                }

                // 检查文件大小 (10MB)
                if (file.size > 10 * 1024 * 1024) {
                    this.showError(`文件过大: ${file.name} (最大10MB)`);
                    continue;
                }

                // 上传文件
                const formData = new FormData();
                formData.append('file', file);
                if (this.currentSessionId) {
                    formData.append('session_id', this.currentSessionId);
                }

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('📁 文件上传成功:', result);
                    this.uploadedFiles.push(result);
                    console.log('📋 当前已上传文件数量:', this.uploadedFiles.length);
                    console.log('📋 已上传文件列表:', this.uploadedFiles.map(f => f.filename));
                    this.renderFileAttachments();
                    this.showSuccess(`文件上传成功: ${file.name}`);
                } else {
                    const error = await response.json();
                    console.error('📁 文件上传失败:', error);
                    this.showError(`上传失败: ${error.detail}`);
                }
            }
        } catch (error) {
            console.error('文件上传错误:', error);
            this.showError('文件上传失败');
        } finally {
            // 恢复按钮状态
            fileUploadBtn.classList.remove('uploading');
            fileUploadBtn.innerHTML = '<i class="fas fa-paperclip"></i>';
            
            // 清空file input
            document.getElementById('file-input').value = '';
        }
    }

    isValidFileType(file) {
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown',
            'image/png',
            'image/jpeg'
        ];
        
        const validExtensions = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.png', '.jpg', '.jpeg'];
        
        return validTypes.includes(file.type) || 
               validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    }

    renderFileAttachments() {
        const attachmentsContainer = document.getElementById('file-attachments');
        
        if (this.uploadedFiles.length === 0) {
            attachmentsContainer.style.display = 'none';
            return;
        }

        attachmentsContainer.style.display = 'block';
        attachmentsContainer.innerHTML = '';

        this.uploadedFiles.forEach((file, index) => {
            const attachmentElement = document.createElement('div');
            attachmentElement.className = 'file-attachment';
            
            const fileType = this.getFileTypeClass(file.file_type);
            const fileSize = this.formatFileSize(file.file_size);
            
            attachmentElement.innerHTML = `
                <div class="file-icon ${fileType}">
                    ${this.getFileTypeIcon(file.file_type)}
                </div>
                <div class="file-info">
                    <div class="file-name" title="${file.filename}">${file.filename}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <button class="file-remove" onclick="chat.removeFile(${index})" title="删除文件">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            attachmentsContainer.appendChild(attachmentElement);
            
            // 添加图片预览
            if (this.isImageFile(file.file_type)) {
                const imagePreview = this.createImagePreview(file);
                if (imagePreview) {
                    attachmentElement.appendChild(imagePreview);
                }
            }
        });
    }

    getFileTypeClass(fileType) {
        const typeMap = {
            'pdf': 'pdf',
            'docx': 'docx', 
            'txt': 'txt',
            'md': 'md',
            'png': 'img',
            'jpg': 'img',
            'jpeg': 'img'
        };
        return typeMap[fileType] || 'txt';
    }

    getFileTypeIcon(fileType) {
        const iconMap = {
            'pdf': 'PDF',
            'docx': 'DOC',
            'txt': 'TXT',
            'md': 'MD',
            'png': 'PNG',
            'jpg': 'JPG',
            'jpeg': 'JPG'
        };
        return iconMap[fileType] || 'FILE';
    }

    scrollToBottom() {
        const container = document.getElementById('messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // 检测并渲染音频播放器（用于流式输出完成后）
    renderAudioPlayer(messageTextDiv, content) {
        // 检测是否包含音频链接
        const audioUrlMatch = content.match(/(https?:\/\/[^\s]+(?:audio|speech|sound|voice)[^\s]*)|https?:\/\/[^\s]+\.(mp3|wav|ogg|m4a|aac)/i);
        const isAudioGeneration = content.includes('Generated Audio') || content.includes('Generating Audio');
        
        if (isAudioGeneration && audioUrlMatch) {
            // 提取音频URL
            let audioUrl = audioUrlMatch[0];
            
            // 如果URL前面有 "Generated Audio!" 等文本，也要提取
            const fullMatch = content.match(/Generated\s+Audio[!:：\s]*((https?:\/\/[^\s]+))/i);
            if (fullMatch) {
                audioUrl = fullMatch[1];
            }
            
            // 移除URL和相关文本，保留其他内容
            const textWithoutUrl = content
                .replace(/Generated\s+Audio[!:：\s]*/gi, '')
                .replace(/Generating\s+Audio[^)]*\)/gi, '')
                .replace(audioUrl, '')
                .trim();
            
            // 清空并重新渲染
            messageTextDiv.innerHTML = '';
            
            // 渲染文本部分（如果有）
            if (textWithoutUrl && window.renderEnhancedMarkdown) {
                window.renderEnhancedMarkdown(textWithoutUrl, messageTextDiv);
            } else if (textWithoutUrl) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.formatContent(textWithoutUrl, 'agent');
                messageTextDiv.appendChild(tempDiv);
            }
            
            // 创建音频播放器
            const audioPlayer = document.createElement('div');
            audioPlayer.className = 'audio-player-container';
            audioPlayer.innerHTML = `
                <div class="audio-player">
                    <div class="audio-icon">🎙️</div>
                    <div class="audio-info">
                        <div class="audio-title">生成的语音</div>
                        <audio controls class="audio-element" preload="metadata">
                            <source src="${audioUrl}" type="audio/mpeg">
                            您的浏览器不支持音频播放。
                        </audio>
                    </div>
                    <a href="${audioUrl}" download="hailuo-speech.mp3" class="audio-download" title="下载音频">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
            `;
            messageTextDiv.appendChild(audioPlayer);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    setupImageModal() {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('image-modal-img');
        const closeBtn = document.getElementById('image-modal-close');

        // 关闭模态框
        const closeModal = () => {
            modal.style.display = 'none';
        };

        closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal();
            }
        });
    }

    showImageModal(imageSrc) {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('image-modal-img');
        
        modalImg.src = imageSrc;
        modal.style.display = 'flex';
    }

    isImageFile(fileType) {
        return ['png', 'jpg', 'jpeg'].includes(fileType);
    }

    createImagePreview(file) {
        if (!this.isImageFile(file.file_type)) {
            return null;
        }

        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';

        const label = document.createElement('span');
        label.className = 'image-preview-label';
        label.textContent = '图片预览:';

        const img = document.createElement('img');
        img.className = 'image-preview';
        // 使用 safe_filename 而不是 filename，因为后端保存的是带UUID的安全文件名
        img.src = `/uploads/${file.safe_filename || file.filename}`;
        img.alt = file.filename;
        img.onclick = () => this.showImageModal(img.src);

        previewContainer.appendChild(label);
        previewContainer.appendChild(img);

        return previewContainer;
    }

    removeFile(index) {
        if (index >= 0 && index < this.uploadedFiles.length) {
            const file = this.uploadedFiles[index];
            
            // 从服务器删除文件
            fetch(`/api/files/${file.file_id}`, {
                method: 'DELETE'
            }).catch(error => {
                console.error('删除文件失败:', error);
            });
            
            // 从本地列表中移除
            this.uploadedFiles.splice(index, 1);
            this.renderFileAttachments();
        }
    }

    showSuccess(message) {
        // 简单的成功提示，可以后续改进为更好的UI
        console.log('✅', message);
        // 这里可以添加toast提示
    }

    showError(message) {
        // 简单的错误提示，可以后续改进为更好的UI
        console.error('❌', message);
        alert(message); // 临时使用alert，后续可改为toast
    }

    // 讨论文件上传处理
    async handleDiscussionFileUpload(files) {
        const fileUploadBtn = document.getElementById('discussion-file-upload-btn');
        
        // 检查文件数量限制（讨论功能建议最多6个文件）
        if (this.discussionFiles.length + files.length > 6) {
            this.showError(`讨论文件数量限制：最多6个文件（当前已有${this.discussionFiles.length}个）`);
            return;
        }
        
        // 设置上传状态
        fileUploadBtn.classList.add('uploading');
        fileUploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...';

        try {
            for (let file of files) {
                // 检查文件类型
                if (!this.isValidFileType(file)) {
                    this.showError(`不支持的文件类型: ${file.name}`);
                    continue;
                }

                // 检查文件大小 (5MB，讨论用文件建议更小)
                if (file.size > 5 * 1024 * 1024) {
                    this.showError(`文件过大: ${file.name} (讨论文件建议最大5MB)`);
                    continue;
                }

                // 上传文件
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('📁 讨论文件上传成功:', result);
                    this.discussionFiles.push(result);
                    this.renderDiscussionFileAttachments();
                    this.showSuccess(`讨论文件上传成功: ${file.name}`);
                } else {
                    const error = await response.json();
                    console.error('📁 讨论文件上传失败:', error);
                    this.showError(`上传失败: ${error.detail}`);
                }
            }
        } catch (error) {
            console.error('讨论文件上传错误:', error);
            this.showError('文件上传失败');
        } finally {
            // 恢复按钮状态
            fileUploadBtn.classList.remove('uploading');
            fileUploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> 上传文档';
            
            // 清空file input
            document.getElementById('discussion-file-input').value = '';
        }
    }

    // 渲染讨论文件附件
    renderDiscussionFileAttachments() {
        const attachmentsContainer = document.getElementById('discussion-file-attachments');
        
        if (this.discussionFiles.length === 0) {
            attachmentsContainer.style.display = 'none';
            return;
        }

        attachmentsContainer.style.display = 'block';
        attachmentsContainer.innerHTML = '';

        this.discussionFiles.forEach((file, index) => {
            const attachmentElement = document.createElement('div');
            attachmentElement.className = 'discussion-file-attachment';
            
            const fileType = this.getFileTypeClass(file.file_type);
            const fileSize = this.formatFileSize(file.file_size);
            
            attachmentElement.innerHTML = `
                <div class="discussion-file-icon ${fileType}">
                    ${this.getFileTypeIcon(file.file_type)}
                </div>
                <div class="discussion-file-info">
                    <div class="discussion-file-name" title="${file.filename}">${file.filename}</div>
                    <div class="discussion-file-size">${fileSize}</div>
                </div>
                <button class="discussion-file-remove" onclick="chat.removeDiscussionFile(${index})" title="删除文件">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            attachmentsContainer.appendChild(attachmentElement);
        });
    }

    // 删除讨论文件
    removeDiscussionFile(index) {
        if (index >= 0 && index < this.discussionFiles.length) {
            const file = this.discussionFiles[index];
            
            // 从服务器删除文件
            fetch(`/api/files/${file.file_id}`, {
                method: 'DELETE'
            }).catch(error => {
                console.error('删除讨论文件失败:', error);
            });
            
            // 从本地列表中移除
            this.discussionFiles.splice(index, 1);
            this.renderDiscussionFileAttachments();
        }
    }

    // 更新讨论详细进度显示
    updateDiscussionDetailedProgress(currentAgent, action, showSpinner = false) {
        const statusContainer = document.getElementById('discussion-current-status');
        const speakerName = document.getElementById('current-speaker-name');
        const actionElement = document.getElementById('current-action');
        
        if (statusContainer && speakerName && actionElement) {
            statusContainer.style.display = 'block';
            speakerName.textContent = currentAgent || '准备中...';
            
            const actionText = actionElement.querySelector('.action-text');
            const actionSpinner = actionElement.querySelector('.action-spinner');
            
            if (actionText) actionText.textContent = action;
            if (actionSpinner) {
                actionSpinner.style.display = showSpinner ? 'inline-flex' : 'none';
            }
        }
    }

    // 隐藏讨论详细进度
    hideDiscussionDetailedProgress() {
        const statusContainer = document.getElementById('discussion-current-status');
        if (statusContainer) {
            statusContainer.style.display = 'none';
        }
    }

    // 清空讨论表单
    clearDiscussionForm() {
        try {
            // 清空讨论问题输入框
            const questionInput = document.getElementById('discussion-question-input');
            if (questionInput) {
                questionInput.value = '';
                questionInput.style.height = 'auto';
            }

            // 重置讨论轮次到默认值
            const roundsSelect = document.getElementById('discussion-rounds');
            if (roundsSelect) {
                roundsSelect.value = '3';
            }

            // 取消选择所有Agent
            const agentCheckboxes = document.querySelectorAll('.agent-option input[type="checkbox"]');
            agentCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                checkbox.parentElement.classList.remove('selected');
            });

            // 清空讨论文件
            this.discussionFiles = [];
            this.renderDiscussionFileAttachments();

            console.log('✅ 讨论表单已清空，准备下次使用');
        } catch (error) {
            console.error('清空讨论表单失败:', error);
        }
    }

    // 🔄 简化的任务轮询
    async pollTaskStatus(taskId, sessionId, progressBar, taskData) {
        const poll = async () => {
            try {
                const response = await fetch(`/api/tasks/${taskId}`);
                if (!response.ok) return;
                
                const status = await response.json();
                
                if (status.status === 'completed') {
                    this.updateDiscussionProgressBar(progressBar, 'completed', taskData.rounds, taskData.selectedAgents.length);
                    this.showTaskNotification('🎉 讨论完成！', 'success');
                    
                    // 如果用户在讨论会话中，重新加载
                    if (this.currentSessionId === sessionId) {
                        await this.loadSession(sessionId);
                    }
                } else if (status.status === 'failed') {
                    this.updateDiscussionProgressBar(progressBar, 'error', 0, 0, status.error);
                    this.showTaskNotification('❌ 讨论失败', 'error');
                } else {
                    // 继续轮询
                    setTimeout(poll, 2000);
                }
            } catch (error) {
                setTimeout(poll, 3000); // 出错时重试
            }
        };
        
        setTimeout(poll, 2000); // 2秒后开始轮询
    }



    showTaskNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `task-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // 添加到页面顶部
        document.body.insertBefore(notification, document.body.firstChild);
        
        // 自动消失
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, type === 'error' ? 8000 : 5000);
    }

    // 初始化记忆管理
    initMemoryManagement() {
        const memoryBtn = document.getElementById('memory-btn');
        const memoryModal = document.getElementById('memory-modal');
        const memoryModalClose = document.getElementById('memory-modal-close');
        const addMemoryBtn = document.getElementById('add-memory-btn');
        const memoryEditModal = document.getElementById('memory-edit-modal');
        const memoryEditClose = document.getElementById('memory-edit-close');
        const memoryCancelBtn = document.getElementById('memory-cancel-btn');
        const memoryForm = document.getElementById('memory-form');
        const memoryCategoryFilter = document.getElementById('memory-category-filter');
        
        if (!memoryBtn) {
            console.error('记忆按钮未找到');
            return;
        }
        
        // 打开记忆管理模态框
        memoryBtn.addEventListener('click', () => {
            console.log('记忆按钮被点击');
            memoryModal.style.display = 'flex';
            loadMemories();
        });
        
        // 关闭记忆管理模态框
        if (memoryModalClose) {
            memoryModalClose.addEventListener('click', () => {
                memoryModal.style.display = 'none';
            });
        }
        
        // 点击模态框外部关闭
        if (memoryModal) {
            memoryModal.addEventListener('click', (e) => {
                if (e.target === memoryModal) {
                    memoryModal.style.display = 'none';
                }
            });
        }
        
        // 打开新建记忆对话框
        if (addMemoryBtn) {
            addMemoryBtn.addEventListener('click', () => {
                openMemoryEditModal();
            });
        }
        
        // 关闭编辑记忆模态框
        if (memoryEditClose) {
            memoryEditClose.addEventListener('click', closeMemoryEditModal);
        }
        if (memoryCancelBtn) {
            memoryCancelBtn.addEventListener('click', closeMemoryEditModal);
        }
        
        // 点击编辑模态框外部关闭
        if (memoryEditModal) {
            memoryEditModal.addEventListener('click', (e) => {
                if (e.target === memoryEditModal) {
                    closeMemoryEditModal();
                }
            });
        }
        
        // 提交表单
        if (memoryForm) {
            memoryForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveMemory();
            });
        }
        
        // 分类筛选
        if (memoryCategoryFilter) {
            memoryCategoryFilter.addEventListener('change', () => {
                loadMemories(memoryCategoryFilter.value);
            });
        }
    }
}

// 页面加载完成后初始化
let chat; // 全局变量，用于onclick事件访问
document.addEventListener('DOMContentLoaded', () => {
    chat = new MultiAgentChat();
});

// 工具函数：格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
        return '刚刚';
    } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 24小时内
        return `${Math.floor(diff / 3600000)}小时前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// 工具函数：处理@提及高亮
function highlightMentions(text) {
    return text.replace(/@(\w+)/g, '<span style="color: #4F46E5; font-weight: 600;">@$1</span>');
}

// ==================== 长期记忆管理功能 ====================

let memories = [];
let currentEditingMemoryId = null;

// 全局通知函数
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        </div>
        <div class="notification-message">${message}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // 添加到页面顶部
    document.body.appendChild(notification);
    
    // 自动消失
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, type === 'error' ? 8000 : 5000);
}

// 全局HTML转义函数
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 加载记忆列表
async function loadMemories(category = '') {
    try {
        const url = category ? `/api/memories?category=${category}` : '/api/memories';
        const response = await fetch(url);
        const data = await response.json();
        memories = data.memories;
        renderMemoriesList();
    } catch (error) {
        console.error('加载记忆失败:', error);
        showNotification('加载记忆失败', 'error');
    }
}

// 渲染记忆列表
function renderMemoriesList() {
    const memoriesList = document.getElementById('memories-list');
    
    if (memories.length === 0) {
        memoriesList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
                <i class="fas fa-brain" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                <p>还没有任何记忆，点击"新建记忆"开始添加</p>
            </div>
        `;
        return;
    }
    
    memoriesList.innerHTML = memories.map(memory => `
        <div class="memory-card" data-id="${memory.id}">
            <div class="memory-card-header">
                <div class="memory-card-title">${escapeHtml(memory.title)}</div>
                <div class="memory-card-actions">
                    <button class="memory-card-action-btn edit" onclick="editMemory('${memory.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="memory-card-action-btn delete" onclick="deleteMemory('${memory.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="memory-card-content">${escapeHtml(memory.content)}</div>
            <div class="memory-card-footer">
                <div class="memory-card-meta">
                    <span class="memory-card-category">${getCategoryLabel(memory.category)}</span>
                    <span class="memory-card-importance">${'⭐'.repeat(memory.importance || 3)}</span>
                </div>
                ${memory.tags && memory.tags.length > 0 ? `
                    <div class="memory-card-tags">
                        ${memory.tags.map(tag => `<span class="memory-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 获取分类标签
function getCategoryLabel(category) {
    const labels = {
        'general': '通用',
        'work': '工作',
        'personal': '个人',
        'knowledge': '知识'
    };
    return labels[category] || category;
}

// 打开记忆编辑模态框
function openMemoryEditModal(memory = null) {
    const modal = document.getElementById('memory-edit-modal');
    const titleText = document.getElementById('memory-edit-title-text');
    const form = document.getElementById('memory-form');
    
    if (memory) {
        // 编辑模式
        titleText.textContent = '编辑记忆';
        document.getElementById('memory-id').value = memory.id;
        document.getElementById('memory-title-input').value = memory.title;
        document.getElementById('memory-content-input').value = memory.content;
        document.getElementById('memory-category-input').value = memory.category || 'general';
        document.getElementById('memory-importance-input').value = memory.importance || 3;
        document.getElementById('memory-tags-input').value = (memory.tags || []).join(', ');
        currentEditingMemoryId = memory.id;
    } else {
        // 新建模式
        titleText.textContent = '新建记忆';
        form.reset();
        document.getElementById('memory-id').value = '';
        currentEditingMemoryId = null;
    }
    
    modal.style.display = 'flex';
}

// 关闭记忆编辑模态框
function closeMemoryEditModal() {
    document.getElementById('memory-edit-modal').style.display = 'none';
    document.getElementById('memory-form').reset();
    currentEditingMemoryId = null;
}

// 编辑记忆
async function editMemory(memoryId) {
    const memory = memories.find(m => m.id === memoryId);
    if (memory) {
        openMemoryEditModal(memory);
    }
}

// 保存记忆
async function saveMemory() {
    const title = document.getElementById('memory-title-input').value.trim();
    const content = document.getElementById('memory-content-input').value.trim();
    const category = document.getElementById('memory-category-input').value;
    const importance = parseInt(document.getElementById('memory-importance-input').value);
    const tagsInput = document.getElementById('memory-tags-input').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    if (!title || !content) {
        showNotification('请填写标题和内容', 'warning');
        return;
    }
    
    const memoryData = {
        title,
        content,
        category,
        importance,
        tags
    };
    
    try {
        let response;
        if (currentEditingMemoryId) {
            // 更新记忆
            response = await fetch(`/api/memories/${currentEditingMemoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(memoryData)
            });
        } else {
            // 创建新记忆
            response = await fetch('/api/memories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(memoryData)
            });
        }
        
        if (response.ok) {
            const result = await response.json();
            showNotification(result.message || '保存成功', 'success');
            closeMemoryEditModal();
            
            // 重新加载记忆列表
            const currentCategory = document.getElementById('memory-category-filter').value;
            await loadMemories(currentCategory);
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('保存记忆失败:', error);
        showNotification('保存记忆失败', 'error');
    }
}

// 删除记忆
async function deleteMemory(memoryId) {
    if (!confirm('确定要删除这条记忆吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/memories/${memoryId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('记忆已删除', 'success');
            
            // 重新加载记忆列表
            const currentCategory = document.getElementById('memory-category-filter').value;
            await loadMemories(currentCategory);
        } else {
            throw new Error('删除失败');
        }
    } catch (error) {
        console.error('删除记忆失败:', error);
        showNotification('删除记忆失败', 'error');
    }
}

