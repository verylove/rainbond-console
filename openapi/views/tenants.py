# -*- coding: utf8 -*-
from rest_framework.response import Response

from django.contrib.auth.models import User as OAuthUser

from www.models import Tenants, Users
from www.forms.account import is_standard_word, is_sensitive

from openapi.views.base import BaseAPIView
from openapi.controllers.openservicemanager import OpenTenantServiceManager
import logging

logger = logging.getLogger("default")
manager = OpenTenantServiceManager()


class TenantServiceView(BaseAPIView):

    allowed_methods = ('POST',)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def post(self, request, *args, **kwargs):
        """
        注册用户租户
        ---
        parameters:
            - name: username
              description: 用户名
              required: true
              type: int
              paramType: form
            - name: password
              description: 密码
              required: true
              type: string
              paramType: form
            - name: tenant_name
              description: 租户名称
              required: true
              type: string
              paramType: form
            - name: region
              description: 数据中心
              required: true
              type: string
              paramType: form
        """
        # 数据中心
        region = request.POST.get("region")
        username = request.POST.get("username")
        password = request.POST.get("password")
        tenant_name = request.POST.get("tenant_name")
        if region is None:
            return Response(status=405, data={"success": False, "msg": u"数据中心名称为空"})
        if username is None:
            return Response(status=406, data={"success": False, "msg": u"用户名不能为空"})
        if tenant_name is None:
            return Response(status=407, data={"success": False, "msg": u"租户名称不能为空!"})
        # 校验username
        try:
            is_standard_word(username)
            is_sensitive(username)
        except Exception as e:
            return Response(status=408, data={"success": False, "msg": u"用户名不合法!"})
        try:
            is_standard_word(tenant_name)
            is_sensitive(tenant_name)
        except Exception as e:
            return Response(status=408, data={"success": False, "msg": u"租户名称不合法!"})

        # 参数log
        logger.debug("openapi.services", "now create user tenant: tenant_name:{0}, region:{1}, username:{2}".format(tenant_name, region, username))

        # 创建用户
        try:
            curr_user = Users.objects.get(nick_name=username)
        except Users.DoesNotExist:
            rf = "openapi"
            # 用户不存在,检查password
            if password is None:
                return Response(status=410, data={"success": False, "msg": u"密码不能为空"})
            # 新增用户
            curr_user = Users(nick_name=username,
                              client_ip=self.get_client_ip(request),
                              rf=rf)
            # 设置密码
            curr_user.set_password(password)
            curr_user.save()
            logger.debug("openapi.services", "now create user success")

            # 添加auth_user
            oauth_user = OAuthUser.objects.create(username=username)
            oauth_user.set_password(password)
            oauth_user.is_staff = True
            oauth_user.save()

        # 处理租户逻辑
        try:
            tenant = Tenants.objects.get(tenant_name=tenant_name)
        except Tenants.DoesNotExist:
            logger.debug("openapi.services", "Tenant {0} is not exists, now create...".format(tenant_name))
            # 创建tenant
            tenant = manager.create_tenant(tenant_name, region, curr_user.user_id, username)
        if tenant:
            return Response(status=200, data={"success": True,
                                              "tenant": tenant,
                                              "user": curr_user})
        else:
            return Response(status=500, data={"success": False,
                                              "msg": "操作失败!"})

