<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import ConfirmDialog from '@components/common/ConfirmDialog.vue';
    import SvgIcon from '@components/common/SvgIcon.vue';
    import TitleBar from '@components/common/TitleBar.vue';
    import AddProviderDialog from '@components/settings/AddProviderDialog.vue';
    import BadgedLogo from '@components/settings/BadgedLogo.vue';
    import EditProviderDialog from '@components/settings/EditProviderDialog.vue';
    import ModelList from '@components/settings/ModelList.vue';
    import ProviderConfig from '@components/settings/ProviderConfig.vue';
    import ProviderContextMenu from '@components/settings/ProviderContextMenu.vue';
    import ProviderList from '@components/settings/ProviderList.vue';
    import { useAlert } from '@composables/useAlert';
    import { useConfirm } from '@composables/useConfirm';
    import {
        createModel,
        createProvider,
        deleteModel,
        deleteProvider,
        findAllModels,
        findAllProvidersSorted,
        findDefaultModel,
        findProviderById,
        setDefaultModel,
        updateModel,
        updateProvider,
    } from '@database/queries';
    import type { Model, NewModel, NewProvider, Provider } from '@database/schema';
    import { aiService } from '@services/ai/manager';
    import { computed, onMounted, ref } from 'vue';

    const alert = useAlert();
    const { confirmState, handleConfirm, handleCancel } = useConfirm();

    const providers = ref<Provider[]>([]);
    const models = ref<Model[]>([]);
    const selectedProviderId = ref<number | null>(null);
    const defaultModelId = ref<number | null>(null);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const showAddDialog = ref(false);
    const showEditDialog = ref(false);
    const refreshing = ref(false);
    const refreshingProviderId = ref<number | null>(null); // 记录正在刷新的供应商ID

    // 右键菜单状态
    const contextMenu = ref<{
        show: boolean;
        x: number;
        y: number;
        providerId: number | null;
    }>({
        show: false,
        x: 0,
        y: 0,
        providerId: null,
    });

    // 计算属性
    const selectedProvider = computed(() =>
        providers.value.find((p) => p.id === selectedProviderId.value)
    );

    const selectedProviderModels = computed(() =>
        models.value.filter((m) => m.provider_id === selectedProviderId.value)
    );

    const defaultModelProviderIds = computed(() => {
        const ids = new Set<number>();
        const defaultModel = models.value.find((m) => m.is_default === 1);
        if (defaultModel) {
            ids.add(defaultModel.provider_id);
        }
        return ids;
    });

    // 加载数据
    const loadData = async (preserveScrollPosition = false) => {
        try {
            // 只在初始加载时显示 loading 状态
            if (!preserveScrollPosition) {
                loading.value = true;
            }
            error.value = null;

            [providers.value, models.value] = await Promise.all([
                findAllProvidersSorted(),
                findAllModels(),
            ]);

            const defaultModel = await findDefaultModel();
            defaultModelId.value = defaultModel?.id || null;

            // 自动选择第一个服务商
            if (providers.value.length > 0 && !selectedProviderId.value) {
                selectedProviderId.value = providers.value[0]?.id || null;
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : '加载失败';
            console.error('Failed to load data:', err);
        } finally {
            if (!preserveScrollPosition) {
                loading.value = false;
            }
        }
    };

    // 服务商操作
    const selectProvider = async (providerId: number) => {
        // 切换供应商时，清除刷新状态（让旧的刷新请求返回时被忽略）
        if (refreshing.value) {
            refreshing.value = false;
            refreshingProviderId.value = null;
        }

        selectedProviderId.value = providerId;

        // 检查是否需要自动获取模型列表
        const provider = providers.value.find((p) => p.id === providerId);
        if (!provider) return;

        const providerModels = models.value.filter((m) => m.provider_id === providerId);

        // 如果没有模型，且已配置地址，则自动获取
        if (providerModels.length === 0 && provider.api_endpoint) {
            try {
                await handleRefreshModels(true);
            } catch (err) {
                console.error('Auto-fetch models failed:', err);
            }
        }
    };

    const toggleProviderEnabled = async (providerId: number) => {
        try {
            const provider = providers.value.find((p) => p.id === providerId);
            if (!provider) return;

            const newEnabled = provider.enabled === 1 ? 0 : 1;
            await updateProvider(providerId, { enabled: newEnabled });
            await loadData(true); // 保持滚动位置

            if (newEnabled === 1) {
                alert.success('服务商已启用');
            } else {
                alert.info('服务商已禁用');
            }
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '操作失败');
        }
    };

    const handleValidationError = (message: string) => {
        alert.error(message);
    };

    const handleProviderContextMenu = (providerId: number, event: MouseEvent) => {
        contextMenu.value = {
            show: true,
            x: event.clientX,
            y: event.clientY,
            providerId,
        };
    };

    const handleContextMenuEdit = () => {
        if (contextMenu.value.providerId) {
            selectedProviderId.value = contextMenu.value.providerId;
            showEditDialog.value = true;
        }
    };

    const handleContextMenuDelete = () => {
        if (contextMenu.value.providerId) {
            handleDeleteProvider(contextMenu.value.providerId);
        }
    };

    const closeContextMenu = () => {
        contextMenu.value.show = false;
    };

    const handleUpdateProvider = async (data: Partial<Provider>) => {
        if (!selectedProviderId.value) return;

        try {
            await updateProvider(selectedProviderId.value, data);
            // 清除该服务商的缓存，使新配置立即生效
            aiService.clearProviderCache(selectedProviderId.value);
            await loadData(true); // 保持滚动位置
            alert.success('保存成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '保存失败');
        }
    };

    const handleAddCustomProvider = () => {
        showAddDialog.value = true;
    };

    const handleEditProvider = () => {
        showEditDialog.value = true;
    };

    const handleCreateProvider = async (data: NewProvider) => {
        try {
            await createProvider(data);
            await loadData(true); // 保持滚动位置
            showAddDialog.value = false;
            alert.success('创建成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '创建失败');
        }
    };

    const handleUpdateProviderInfo = async (data: Partial<Provider>) => {
        if (!selectedProviderId.value) return;

        try {
            await updateProvider(selectedProviderId.value, data);
            // 清除该服务商的缓存，使新配置立即生效
            aiService.clearProviderCache(selectedProviderId.value);
            await loadData(true); // 保持滚动位置
            showEditDialog.value = false;
            alert.success('保存成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '保存失败');
        }
    };

    const handleDeleteProvider = async (providerId: number) => {
        try {
            await deleteProvider(providerId);
            await loadData(true); // 保持滚动位置
            if (selectedProviderId.value === providerId) {
                selectedProviderId.value = providers.value[0]?.id || null;
            }
            showEditDialog.value = false;
            alert.success('删除成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '删除失败');
        }
    };

    // 模型操作
    const handleCreateModel = async (data: NewModel) => {
        try {
            await createModel(data);
            await loadData(true); // 保持滚动位置
            alert.success('创建成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '创建失败');
        }
    };

    const handleUpdateModel = async (id: number, data: Partial<Model>) => {
        try {
            await updateModel(id, data);
            // 清除所有缓存，因为模型配置可能影响多个服务商
            aiService.clearProviderCache();
            await loadData(true); // 保持滚动位置
            alert.success('保存成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '保存失败');
        }
    };

    const handleDeleteModel = async (id: number, silent = false) => {
        try {
            await deleteModel(id);
            await loadData(true); // 保持滚动位置
            if (!silent) {
                alert.success('删除成功');
            }
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '删除失败');
        }
    };

    const handleSetDefaultModel = async (id: number) => {
        try {
            await setDefaultModel(id);
            await loadData(true); // 保持滚动位置
            alert.success('设置成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '设置失败');
        }
    };

    // 刷新模型列表
    const handleRefreshModels = async (silent = false) => {
        if (!selectedProviderId.value) return;

        const currentProviderId = selectedProviderId.value;
        refreshingProviderId.value = currentProviderId;

        try {
            refreshing.value = true;
            const provider = await findProviderById(currentProviderId);
            if (!provider) {
                if (!silent) alert.error('服务商不存在');
                return;
            }

            // 检查是否已切换到其他供应商
            if (refreshingProviderId.value !== currentProviderId) {
                return;
            }

            // 先尝试不带 key 获取模型列表
            let providerInstance = aiService.createProviderInstance(
                provider.type,
                provider.api_endpoint,
                'placeholder_for_models'
            );

            let fetchedModels;
            try {
                fetchedModels = await providerInstance.listModels();
            } catch (error) {
                // 检查是否已切换到其他供应商
                if (refreshingProviderId.value !== currentProviderId) {
                    return;
                }

                // 如果失败，检查是否是认证错误
                const errorMessage = error instanceof Error ? error.message : String(error);
                const isAuthError =
                    errorMessage.includes('401') ||
                    errorMessage.includes('403') ||
                    errorMessage.includes('Unauthorized') ||
                    errorMessage.includes('authentication') ||
                    errorMessage.includes('API key');

                if (isAuthError && provider.api_key) {
                    // 如果是认证错误且已配置 key，尝试带 key 重新获取
                    providerInstance = aiService.createProviderInstance(
                        provider.type,
                        provider.api_endpoint,
                        provider.api_key
                    );
                    fetchedModels = await providerInstance.listModels();
                } else if (isAuthError && !provider.api_key) {
                    // 如果是认证错误且未配置 key，提示用户
                    if (!silent) {
                        alert.warning('该服务商需要配置 API Key 才能获取模型列表');
                    }
                    return;
                } else {
                    // 其他错误，重新抛出
                    throw error;
                }
            }

            // 检查是否已切换到其他供应商
            if (refreshingProviderId.value !== currentProviderId) {
                return;
            }

            if (fetchedModels.length === 0) {
                if (!silent) alert.info('未获取到模型列表');
                return;
            }

            // 获取当前服务商的现有模型
            const existingModels = models.value.filter((m) => m.provider_id === provider.id);
            const existingModelIds = new Set(existingModels.map((m) => m.model_id));

            // 添加新模型
            let addedCount = 0;
            for (const fetchedModel of fetchedModels) {
                // 检查是否已切换到其他供应商
                if (refreshingProviderId.value !== currentProviderId) {
                    return;
                }

                if (!existingModelIds.has(fetchedModel.id)) {
                    await createModel({
                        provider_id: provider.id,
                        name: fetchedModel.name,
                        model_id: fetchedModel.id,
                        is_default: 0,
                    });
                    addedCount++;
                }
            }

            // 检查是否已切换到其他供应商
            if (refreshingProviderId.value !== currentProviderId) {
                return;
            }

            await loadData(true); // 保持滚动位置
            if (!silent) {
                alert.success(`刷新成功，新增 ${addedCount} 个模型`);
            }
        } catch (err) {
            // 检查是否已切换到其他供应商
            if (refreshingProviderId.value !== currentProviderId) {
                return;
            }

            console.error('Failed to refresh models:', err);
            if (!silent) {
                alert.error(`获取模型列表失败:${err}`);
            }
        } finally {
            // 只有当前供应商还是刷新时的供应商才清理状态
            if (refreshingProviderId.value === currentProviderId) {
                refreshing.value = false;
                refreshingProviderId.value = null;
            }
        }
    };

    onMounted(() => {
        loadData();
    });
</script>

<template>
    <div
        class="bg-background-primary flex h-screen w-screen flex-col"
        style="user-select: none"
        @contextmenu.prevent
    >
        <TitleBar title="设置" />

        <div class="flex flex-1 overflow-hidden">
            <!-- 页面初始化loading -->
            <div v-if="loading" class="flex flex-1 items-center justify-center">
                <div
                    class="border-primary-100 border-t-primary-500 h-10 w-10 animate-spin rounded-full border-3"
                ></div>
            </div>

            <!-- 页面初始化问题提示 -->
            <div v-else-if="error" class="flex flex-1 items-center justify-center">
                <div class="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
                    <p class="font-medium text-gray-900">加载失败</p>
                    <p class="mt-1 text-sm">{{ error }}</p>
                    <button
                        class="bg-primary-500 hover:bg-primary-600 mt-4 rounded-lg px-4 py-2 text-sm text-white transition-colors"
                        @click="() => loadData()"
                    >
                        重试
                    </button>
                </div>
            </div>

            <!-- 正式内容 -->
            <template v-else>
                <ProviderList
                    :providers="providers"
                    :selected-provider-id="selectedProviderId"
                    :default-model-provider-ids="defaultModelProviderIds"
                    @select="selectProvider"
                    @toggle-enabled="toggleProviderEnabled"
                    @add-custom="handleAddCustomProvider"
                    @validation-error="handleValidationError"
                    @context-menu="handleProviderContextMenu"
                />

                <div v-if="selectedProvider" class="custom-scrollbar flex-1 overflow-y-auto p-6">
                    <div class="mx-auto max-w-4xl space-y-6">
                        <div class="rounded-lg border border-gray-200 bg-white p-6">
                            <div class="flex items-center gap-4">
                                <BadgedLogo
                                    :logo="selectedProvider.logo"
                                    :name="selectedProvider.name"
                                    size="large"
                                    :show-badge="selectedProvider.is_builtin === 1"
                                />

                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <h2 class="font-serif text-xl font-semibold text-gray-900">
                                            {{ selectedProvider.name }}
                                        </h2>
                                        <span
                                            class="bg-primary-50 text-primary-600 rounded-full px-2 py-0.5 text-xs font-medium"
                                        >
                                            {{
                                                selectedProvider.type === 'openai'
                                                    ? 'OpenAI'
                                                    : 'Anthropic'
                                            }}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    v-if="!selectedProvider.is_builtin"
                                    class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                    title="编辑服务商"
                                    @click="handleEditProvider"
                                >
                                    <SvgIcon name="edit" class="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <ProviderConfig
                            :provider="selectedProvider"
                            @update="handleUpdateProvider"
                        />

                        <ModelList
                            :provider-id="selectedProvider.id"
                            :models="selectedProviderModels"
                            :default-model-id="defaultModelId"
                            :provider="selectedProvider"
                            :refreshing="refreshing"
                            @create="handleCreateModel"
                            @update="handleUpdateModel"
                            @delete="handleDeleteModel"
                            @set-default="handleSetDefaultModel"
                            @refresh="handleRefreshModels"
                        />
                    </div>
                </div>
            </template>
        </div>

        <!-- 弹窗 -->
        <AddProviderDialog
            v-if="showAddDialog"
            @create="handleCreateProvider"
            @cancel="showAddDialog = false"
        />

        <EditProviderDialog
            v-if="showEditDialog && selectedProvider"
            :provider="selectedProvider"
            @update="handleUpdateProviderInfo"
            @cancel="showEditDialog = false"
        />

        <ProviderContextMenu
            v-if="contextMenu.show"
            :x="contextMenu.x"
            :y="contextMenu.y"
            @edit="handleContextMenuEdit"
            @delete="handleContextMenuDelete"
            @close="closeContextMenu"
        />

        <ConfirmDialog
            v-if="confirmState.show"
            :title="confirmState.title"
            :message="confirmState.message"
            :confirm-text="confirmState.confirmText"
            :cancel-text="confirmState.cancelText"
            :type="confirmState.type"
            @confirm="handleConfirm"
            @cancel="handleCancel"
        />
    </div>
</template>
